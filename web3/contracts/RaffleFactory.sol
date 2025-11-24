// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ProjectRaffle.sol";

/**
 * @title RaffleFactory
 * @notice Factory contract para crear múltiples rifas de proyectos
 * @dev Solo el owner puede crear nuevas rifas
 */
contract RaffleFactory is Ownable {
    // Array de todas las rifas creadas
    ProjectRaffle[] public raffles;
    // Mapping para verificar si una dirección es una rifa creada por este factory
    mapping(address => bool) public isRaffle;
    
    // Configuración de Pyth Entropy
    address public entropyAddress;
    
    // Parámetros configurables para nuevas rifas
    uint256 public platformFee; // Fee de plataforma en basis points (5 = 0.05%)
    uint256 public minTicketPrice; // Precio mínimo del ticket en wei
    uint32 public entropyCallbackGasLimit; // Límite de gas para callback de Entropy
    
    // Eventos
    event RaffleCreated(
        address indexed raffleAddress,
        uint256 projectPercentage,
        address indexed creator
    );
    event EntropyConfigUpdated(address entropyAddress);
    event PlatformFeeUpdated(uint256 newFee);
    event MinTicketPriceUpdated(uint256 newPrice);
    event EntropyGasLimitUpdated(uint32 newLimit);
    
    /**
     * @notice Constructor del factory
     * @param _entropyAddress Dirección del contrato de Pyth Entropy
     * @param _initialOwner Dirección del owner inicial
     */
    constructor(
        address _entropyAddress,
        address _initialOwner
    ) {
        require(_entropyAddress != address(0), "Invalid Entropy address");
        require(_initialOwner != address(0), "Invalid owner address");
        entropyAddress = _entropyAddress;
        _transferOwnership(_initialOwner);
        
        platformFee = 5; // 0.05%
        minTicketPrice = 0.0001 ether;
        entropyCallbackGasLimit = 100000;
    }
    
    /**
     * @notice Crea una nueva rifa
     * @param projectPercentage Porcentaje para el proyecto (Basis Points: 5000 = 50%)
     * @param projectAddress Dirección del proyecto que recibirá fondos
     * @param raffleDuration Duración de la rifa en segundos
     * @return Dirección del contrato de rifa creado
     */
    function createRaffle(
        uint256 projectPercentage,
        address projectAddress,
        uint256 raffleDuration
    ) external returns (address) {
        require(projectPercentage <= 10000, "Project percentage cannot exceed 100%");
        require(projectPercentage > 0, "Project percentage must be > 0");
        require(projectAddress != address(0), "Invalid project address");
        require(raffleDuration > 0, "Duration must be > 0");
        
        // Crear nueva instancia de ProjectRaffle
        ProjectRaffle raffle = new ProjectRaffle(
            projectPercentage,
            entropyAddress,
            msg.sender, // El creador de la rifa es el owner
            owner(), // El admin de la plataforma es el owner del factory
            projectAddress,
            raffleDuration,
            platformFee,
            minTicketPrice,
            entropyCallbackGasLimit
        );
        
        // Registrar la rifa
        raffles.push(raffle);
        isRaffle[address(raffle)] = true;
        
        emit RaffleCreated(
            address(raffle),
            projectPercentage,
            msg.sender
        );
        
        return address(raffle);
    }
    
    /**
     * @notice Actualiza la configuración de Entropy
     * @param _entropyAddress Nueva dirección del contrato de Entropy
     */
    function updateEntropyConfig(
        address _entropyAddress
    ) external onlyOwner {
        require(_entropyAddress != address(0), "Invalid Entropy address");
        entropyAddress = _entropyAddress;
        
        emit EntropyConfigUpdated(_entropyAddress);
    }
    
    /**
     * @notice Actualiza la fee de la plataforma para nuevas rifas
     * @param _platformFee Nueva fee en basis points (ej: 5 = 0.05%)
     */
    function updatePlatformFee(uint256 _platformFee) external onlyOwner {
        require(_platformFee <= 1000, "Fee cannot exceed 10%"); // Máximo 10%
        platformFee = _platformFee;
        emit PlatformFeeUpdated(_platformFee);
    }
    
    /**
     * @notice Actualiza el precio mínimo del ticket para nuevas rifas
     * @param _minTicketPrice Nuevo precio mínimo en wei
     */
    function updateMinTicketPrice(uint256 _minTicketPrice) external onlyOwner {
        require(_minTicketPrice > 0, "Price must be > 0");
        minTicketPrice = _minTicketPrice;
        emit MinTicketPriceUpdated(_minTicketPrice);
    }
    
    /**
     * @notice Actualiza el límite de gas para el callback de Entropy en nuevas rifas
     * @param _gasLimit Nuevo límite de gas
     */
    function updateEntropyGasLimit(uint32 _gasLimit) external onlyOwner {
        require(_gasLimit >= 50000, "Gas limit too low"); // Mínimo razonable
        require(_gasLimit <= 500000, "Gas limit too high"); // Máximo razonable
        entropyCallbackGasLimit = _gasLimit;
        emit EntropyGasLimitUpdated(_gasLimit);
    }
    
    /**
     * @notice Obtiene el número total de rifas creadas
     * @return Cantidad de rifas
     */
    function getRaffleCount() external view returns (uint256) {
        return raffles.length;
    }
    
    /**
     * @notice Obtiene todas las direcciones de las rifas creadas (paginado)
     * @param offset Índice inicial (0-based)
     * @param limit Número máximo de rifas a devolver
     * @return Array de direcciones de rifas
     * @return hasMore Indica si hay más rifas después de esta página
     */
    function getAllRaffles(uint256 offset, uint256 limit) external view returns (
        address[] memory,
        bool hasMore
    ) {
        uint256 total = raffles.length;
        require(offset < total, "Offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256 resultLength = end - offset;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = address(raffles[offset + i]);
        }
        
        hasMore = end < total;
        return (result, hasMore);
    }
    
    /**
     * @notice Obtiene información básica de una rifa específica (solo dirección)
     * @param index Índice de la rifa
     * @return raffleAddress Dirección del contrato de rifa
     */
    function getRaffleAddress(uint256 index) external view returns (address raffleAddress) {
        require(index < raffles.length, "Invalid index");
        return address(raffles[index]);
    }
    
    /**
     * @notice Obtiene información completa de una rifa específica
     * @param index Índice de la rifa
     * @return raffleAddress Dirección del contrato de rifa
     * @return state Estado actual de la rifa
     * @return totalTickets Total de tickets vendidos
     * @return participantCount Número de participantes
     */
    function getRaffleInfo(uint256 index) external view returns (
        address raffleAddress,
        ProjectRaffle.RaffleState state,
        uint256 totalTickets,
        uint256 participantCount
    ) {
        require(index < raffles.length, "Invalid index");
        
        ProjectRaffle raffle = raffles[index];
        raffleAddress = address(raffle);
        state = raffle.state();
        totalTickets = raffle.totalTickets();
        participantCount = raffle.getParticipantsCount();
    }
    
    /**
     * @notice Obtiene información básica de múltiples rifas (optimizado)
     * @param indices Array de índices de las rifas
     * @return raffleAddresses Array de direcciones de rifas
     */
    function getRaffleAddresses(uint256[] calldata indices) external view returns (
        address[] memory raffleAddresses
    ) {
        uint256 length = indices.length;
        raffleAddresses = new address[](length);
        uint256 total = raffles.length;
        
        for (uint256 i = 0; i < length; i++) {
            require(indices[i] < total, "Invalid index");
            raffleAddresses[i] = address(raffles[indices[i]]);
        }
    }
    
    /**
     * @notice Obtiene las últimas N rifas creadas (optimizado)
     * @param count Número de rifas a obtener
     * @return Array de direcciones de las últimas rifas
     */
    function getLatestRaffles(uint256 count) external view returns (address[] memory) {
        uint256 total = raffles.length;
        if (total == 0) {
            return new address[](0);
        }
        
        uint256 actualCount = count > total ? total : count;
        address[] memory result = new address[](actualCount);
        
        // Iterar desde el final hacia atrás (más eficiente)
        uint256 startIndex = total - actualCount;
        for (uint256 i = 0; i < actualCount; i++) {
            result[i] = address(raffles[startIndex + i]);
        }
        
        return result;
    }
}

