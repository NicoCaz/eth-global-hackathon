// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";
import { IEntropyConsumer } from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import { IEntropyV2 } from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";

/**
 * @title ProjectRaffle
 * @notice Contrato de rifa para proyectos con integración de Pyth Entropy
 * @dev Los fondos se distribuyen entre: proyecto, owner (mantenimiento), y ganador
 * @dev Usa PullPayment para seguridad y Binary Search para eficiencia
 */
contract ProjectRaffle is Ownable, ReentrancyGuard, PullPayment, IEntropyConsumer {
    // Información del proyecto
    string public projectName;
    string public projectDescription;
    uint256 public projectPercentage; // Porcentaje para el proyecto (0-100)
    uint256 public ownerPercentage; // Porcentaje para el owner/mantenimiento (0-100)
    uint256 public constant MIN_TICKET_PRICE = 0.0001 ether;
    
    // Estado de la rifa
    enum RaffleState { Active, SalesClosed, EntropyRequested, DrawExecuted }
    RaffleState public state;
    
    // Participantes y tickets
    address[] public participants;
    mapping(address => uint256) public tickets;
    uint256 public totalTickets;
    
    // Optimización para selección de ganador
    uint256[] private cumulativeTickets;
    
    // Ganador y distribución
    address public winner;
    bool public fundsDistributed;
    
    // Control de tiempo
    uint256 public immutable raffleDuration;
    uint256 public immutable raffleStartTime;
    address public projectAddress; // Dirección del proyecto guardada al crear la rifa
    address public platformAdmin; // Administrador de la plataforma
    
    // Pyth Entropy
    IEntropyV2 public entropy;
    address public entropyProvider;
    uint64 public entropySequenceNumber;
    
    // Eventos
    event TicketPurchased(address indexed buyer, uint256 amount, uint256 ticketCount);
    event EntropyRequested(uint64 sequenceNumber);
    event DrawExecuted(address indexed winner, uint256 ticketNumber);
    event FundsDistributed(
        address indexed projectAddress,
        address indexed owner,
        address indexed winner,
        uint256 projectAmount,
        uint256 ownerAmount,
        uint256 winnerAmount
    );
    
    /**
     * @notice Constructor del contrato
     * @param _projectName Nombre del proyecto
     * @param _projectDescription Descripción del proyecto
     * @param _projectPercentage Porcentaje para el proyecto (0-100)
     * @param _ownerPercentage Porcentaje para el owner (0-100)
     * @param _entropyAddress Dirección del contrato de Pyth Entropy
     * @param _initialOwner Dirección del owner inicial
     * @param _projectAddress Dirección del proyecto que recibirá fondos
     * @param _raffleDuration Duración de la rifa en segundos
     */
    constructor(
        string memory _projectName,
        string memory _projectDescription,
        uint256 _projectPercentage,
        uint256 _ownerPercentage,
        address _entropyAddress,
        address _initialOwner,
        address _platformAdmin,
        address _projectAddress,
        uint256 _raffleDuration
    ) Ownable(_initialOwner) {
        require(_projectPercentage + _ownerPercentage < 100, "Percentages too high");
        require(_projectPercentage > 0, "Project percentage must be > 0");
        require(_ownerPercentage > 0, "Owner percentage must be > 0");
        require(_entropyAddress != address(0), "Invalid Entropy address");
        require(_projectAddress != address(0), "Invalid project address");
        require(_raffleDuration > 0, "Duration must be > 0");
        
        projectName = _projectName;
        projectDescription = _projectDescription;
        projectPercentage = _projectPercentage;
        ownerPercentage = _ownerPercentage;
        entropy = IEntropyV2(_entropyAddress);
        projectAddress = _projectAddress;
        platformAdmin = _platformAdmin;
        raffleDuration = _raffleDuration;
        raffleStartTime = block.timestamp;
        
        // Obtener proveedor por defecto de Pyth
        entropyProvider = entropy.getDefaultProvider();
        require(entropyProvider != address(0), "No default provider available");
        
        state = RaffleState.Active;
    }
    
    /**
     * @notice Permite a los usuarios comprar tickets
     * @dev 1 wei = 1 ticket
     */
    function buyTickets() external payable {
        require(state == RaffleState.Active, "Raffle not active");
        require(block.timestamp < raffleStartTime + raffleDuration, "Raffle ended");
        require(msg.value >= MIN_TICKET_PRICE, "Minimum ticket price is 0.0001 ETH");
        
        // Registrar participante si es la primera vez
        if (tickets[msg.sender] == 0) {
            participants.push(msg.sender);
        }
        
        tickets[msg.sender] += msg.value;
        totalTickets += msg.value;
        
        emit TicketPurchased(msg.sender, msg.value, tickets[msg.sender]);
    }
    
    modifier onlyOwnerOrAdmin() {
        require(msg.sender == owner() || msg.sender == platformAdmin, "Not authorized");
        _;
    }

    /**
     * @notice Cierra la venta de tickets y construye el array acumulativo
     * @dev Solo el owner o admin puede ejecutar esta función después de que termine el tiempo
     */
    function closeSalesAndBuildCumulative() external onlyOwnerOrAdmin {
        require(state == RaffleState.Active, "Raffle not active");
        require(block.timestamp >= raffleStartTime + raffleDuration, "Raffle still active");
        require(participants.length > 0, "No participants");
        require(cumulativeTickets.length == 0, "Already built");
        
        state = RaffleState.SalesClosed;
        
        // Construir array acumulativo para binary search
        cumulativeTickets = new uint256[](participants.length);
        uint256 cumulative = 0;
        
        for (uint256 i = 0; i < participants.length; i++) {
            cumulative += tickets[participants[i]];
            cumulativeTickets[i] = cumulative;
        }
    }
    
    /**
     * @notice Solicita entropía a Pyth para ejecutar el sorteo
     * @dev Solo el owner o admin puede ejecutar esta función
     * @param userRandomNumber Número aleatorio generado por el usuario
     */
    function requestEntropy(bytes32 userRandomNumber) external payable onlyOwnerOrAdmin {
        require(state == RaffleState.SalesClosed, "Sales not closed");
        require(cumulativeTickets.length > 0, "Cumulative array not built");
        require(totalTickets > 0, "No tickets sold");
        require(participants.length > 0, "No participants");
        
        state = RaffleState.EntropyRequested;
        
        // Obtener el fee necesario para la solicitud
        uint256 fee = entropy.getFee(entropyProvider);
        require(msg.value >= fee, "Insufficient fee");
        
        // Solicitar entropía a Pyth
        entropySequenceNumber = entropy.request{value: fee}(
            entropyProvider,
            userRandomNumber,
            true // use blockhash
        );
        
        emit EntropyRequested(entropySequenceNumber);
        
        // Devolver exceso de fondos si los hay
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
    }
    
    /**
     * @notice Callback de Pyth con la entropía generada
     * @dev Esta función será llamada por el contrato de Entropy
     * @param sequenceNumber Número de secuencia de la solicitud
     * @param provider Dirección del proveedor
     * @param randomNumber Número aleatorio generado
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address provider,
        bytes32 randomNumber
    ) external override {
        require(msg.sender == address(entropy), "Only entropy contract");
        require(state == RaffleState.EntropyRequested, "Entropy not requested");
        require(sequenceNumber == entropySequenceNumber, "Invalid sequence number");
        require(provider == entropyProvider, "Invalid provider");
        
        // Seleccionar ganador
        winner = _selectWinner(randomNumber);
        state = RaffleState.DrawExecuted;
        
        emit DrawExecuted(winner, uint256(randomNumber) % totalTickets);
    }
    
    /**
     * @notice Obtiene la dirección del contrato de Entropy
     * @return Dirección del contrato de Entropy
     */
    function getEntropy() external view override returns (address) {
        return address(entropy);
    }
    
    /**
     * @notice Distribuye los fondos entre proyecto, owner y ganador usando PullPayment
     * @dev Los beneficiarios deben llamar a withdrawPayments() para retirar sus fondos
     */
    function distributeFunds() external onlyOwnerOrAdmin nonReentrant {
        require(state == RaffleState.DrawExecuted, "Draw not executed");
        require(!fundsDistributed, "Funds already distributed");
        require(winner != address(0), "No winner selected");
        require(projectAddress != address(0), "Invalid project address");
        
        fundsDistributed = true;
        
        uint256 totalBalance = address(this).balance;
        
        // Calcular distribución
        uint256 projectAmount = (totalBalance * projectPercentage) / 100;
        uint256 ownerAmount = (totalBalance * ownerPercentage) / 100;
        uint256 winnerAmount = totalBalance - projectAmount - ownerAmount;
        
        // Registrar pagos pendientes (patrón pull payment - más seguro)
        _asyncTransfer(projectAddress, projectAmount);
        _asyncTransfer(owner(), ownerAmount);
        _asyncTransfer(winner, winnerAmount);
        
        emit FundsDistributed(
            projectAddress,
            owner(),
            winner,
            projectAmount,
            ownerAmount,
            winnerAmount
        );
    }
    
    /**
     * @notice Selecciona el ganador usando Binary Search - O(log n)
     * @param entropy Entropía generada por Pyth
     * @return Dirección del ganador
     */
    function _selectWinner(bytes32 entropy) internal view returns (address) {
        require(cumulativeTickets.length > 0, "Cumulative array not built");
        require(participants.length > 0, "No participants");
        
        // Usar entropía de Pyth para seleccionar ticket ganador
        uint256 randomTicket = uint256(entropy) % totalTickets;
        
        // Binary search en array acumulativo - O(log n)
        uint256 left = 0;
        uint256 right = cumulativeTickets.length - 1;
        
        while (left < right) {
            uint256 mid = (left + right) / 2;
            
            if (cumulativeTickets[mid] <= randomTicket) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        
        return participants[left];
    }
    
    /**
     * @notice Obtiene el array de participantes
     * @return Array de direcciones de participantes
     */
    function getParticipants() external view returns (address[] memory) {
        return participants;
    }
    
    /**
     * @notice Obtiene el número de participantes
     * @return Cantidad de participantes
     */
    function getParticipantCount() external view returns (uint256) {
        return participants.length;
    }
    
    /**
     * @notice Obtiene el balance total del contrato
     * @return Balance en wei
     */
    function getTotalBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Verifica si la rifa está activa para comprar tickets
     * @return true si está activa y dentro del tiempo
     */
    function isActive() external view returns (bool) {
        return state == RaffleState.Active && 
               block.timestamp < raffleStartTime + raffleDuration;
    }
    
    /**
     * @notice Obtiene el tiempo restante de la rifa
     * @return Segundos restantes, 0 si ya terminó
     */
    function getTimeRemaining() external view returns (uint256) {
        uint256 endTime = raffleStartTime + raffleDuration;
        if (block.timestamp >= endTime) {
            return 0;
        }
        return endTime - block.timestamp;
    }
    
    /**
     * @notice Obtiene información del ganador potencial sin ejecutar el sorteo
     * @param entropy Entropía de prueba
     * @return Dirección del potencial ganador
     */
    function previewWinner(bytes32 entropy) external view returns (address) {
        require(participants.length > 0, "No participants");
        require(cumulativeTickets.length > 0, "Cumulative array not built");
        return _selectWinner(entropy);
    }
}

