import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '@/db'
import { campaigns } from '@/db/schema'
import { useAppForm } from '@/hooks/demo.form'
import { useNavigate } from '@tanstack/react-router'

// Validation Schema
const createCampaignSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  rafflePercentage: z.number().min(1).max(100),
  goalAmount: z.string().min(1, 'Goal amount is required'),
  endDate: z.string().refine((date) => new Date(date) > new Date(), {
    message: 'End date must be in the future',
  }),
  logo: z.string().default(''),
})

// Server Function
const createCampaign = createServerFn({
  method: 'POST',
})
  .inputValidator((data: unknown) => createCampaignSchema.parse(data))
  .handler(async ({ data }) => {
    // Mock blockchain/user data
    const mockData = {
      contractAddress: `0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`,
      creatorUserId: 'demo-user-id',
      creatorWalletAddress: `0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`,
      status: 'active' as const,
    }

    await db.insert(campaigns).values({
      ...mockData,
      title: data.title,
      description: data.description,
      rafflePercentage: data.rafflePercentage,
      goalAmount: data.goalAmount,
      endDate: new Date(data.endDate),
      logo: data.logo,
      logoMimeType: data.logo ? 'image/jpeg' : undefined, // Simplified for demo
    })

    return { success: true }
  })

export const Route = createFileRoute('/campaign/create')({
  component: CreateCampaign,
})

function CreateCampaign() {
  const navigate = useNavigate()
  
  // Calculate min and max dates
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const oneYearFromNow = new Date(today)
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
  
  const minDate = tomorrow.toISOString().split('T')[0]
  const maxDate = oneYearFromNow.toISOString().split('T')[0]
  
  const form = useAppForm({
    defaultValues: {
      title: '',
      description: '',
      rafflePercentage: '' as any, // Allow empty string during editing
      goalAmount: '',
      endDate: '',
      logo: '',
    },
    onSubmit: async ({ value }) => {
      // Convert rafflePercentage to number before submitting
      const submitValue = {
        ...value,
        rafflePercentage: typeof value.rafflePercentage === 'string' 
          ? parseInt(value.rafflePercentage) || 10 
          : value.rafflePercentage
      }
      await createCampaign({ data: submitValue })
      navigate({ to: '/' })
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        // We would set this in the form, but since logo is optional for now, we'll skip it
        // In a real app, you'd want to update a hidden form field
        console.log('File loaded:', reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Create a Campaign
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Launch your project and start fundraising with our fair raffle system.
          </p>
        </div>

        <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
            className="space-y-6"
          >
            {/* Title */}
            <form.AppField 
              name="title"
              validators={{
                onBlur: ({ value }) => {
                  if (!value || value.length < 3) {
                    return 'Title must be at least 3 characters'
                  }
                  return undefined
                },
              }}
            >
              {(field) => <field.TextField label="Campaign Title" placeholder="My Awesome Project" />}
            </form.AppField>

            {/* Description */}
            <form.AppField 
              name="description"
              validators={{
                onBlur: ({ value }) => {
                  if (!value || value.length < 10) {
                    return 'Description must be at least 10 characters'
                  }
                  return undefined
                },
              }}
            >
              {(field) => <field.TextArea label="Description" rows={5} />}
            </form.AppField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Goal Amount */}
              <form.AppField
                name="goalAmount"
                validators={{
                  onBlur: ({ value }) => {
                    if (!value || value.trim().length === 0) {
                      return 'Goal amount is required'
                    }
                    if (isNaN(Number(value)) || Number(value) <= 0) {
                      return 'Must be a positive number'
                    }
                    return undefined
                  },
                }}
              >
                {(field) => (
                  <field.TextField 
                    label="Goal Amount (ETH)" 
                    placeholder="1.5"
                  />
                )}
              </form.AppField>

              {/* Raffle Percentage */}
              <form.AppField
                name="rafflePercentage"
                validators={{
                  onBlur: ({ value }) => {
                    if (value === '' || value === null || value === undefined) {
                      return 'Raffle percentage is required'
                    }
                    const numValue = typeof value === 'string' ? parseInt(value) : value
                    if (isNaN(numValue) || numValue < 1 || numValue > 100) {
                      return 'Must be between 1 and 100'
                    }
                    return undefined
                  },
                }}
              >
                {(field) => (
                  <div>
                    <label className="mb-2 text-xl font-bold block">Raffle Percentage (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        if (e.target.value === '') {
                          field.handleChange('' as any) // Allow empty during editing
                        } else {
                          const val = parseInt(e.target.value)
                          if (!isNaN(val)) {
                            field.handleChange(val as any)
                          }
                        }
                      }}
                      placeholder="10"
                      className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
                    />
                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                      <div className="text-red-500 mt-1">
                        {field.state.meta.errors.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </form.AppField>
            </div>

            {/* End Date */}
            <form.AppField
              name="endDate"
              validators={{
                onBlur: ({ value }) => {
                  if (!value || value.trim().length === 0) {
                    return 'End date is required'
                  }
                  const selectedDate = new Date(value)
                  const min = new Date(minDate)
                  const max = new Date(maxDate)
                  
                  if (selectedDate < min) {
                    return 'End date must be in the future'
                  }
                  if (selectedDate > max) {
                    return 'End date cannot be more than 1 year from now'
                  }
                  return undefined
                },
              }}
            >
              {(field) => {
                const setPresetDate = (minutes: number) => {
                  const date = new Date()
                  date.setMinutes(date.getMinutes() + minutes)
                  const dateString = date.toISOString().split('T')[0]
                  field.handleChange(dateString)
                  // Clear any errors when a preset is selected
                  field.state.meta.errors = []
                  field.state.meta.isTouched = true
                }

                const getPresetDate = (minutes: number) => {
                  const date = new Date()
                  date.setMinutes(date.getMinutes() + minutes)
                  return date.toISOString().split('T')[0]
                }

                const isPresetActive = (minutes: number) => {
                  return field.state.value === getPresetDate(minutes)
                }

                const presets = [
                  { label: 'In 5 minutes', minutes: 5 },
                  { label: 'In 1 week', minutes: 7 * 24 * 60 },
                  { label: 'In 1 month', minutes: 30 * 24 * 60 },
                  { label: 'In 3 months', minutes: 90 * 24 * 60 },
                  { label: 'In 6 months', minutes: 180 * 24 * 60 },
                ]

                return (
                  <div className="space-y-3">
                    <label className="mb-2 text-xl font-bold block">End Date</label>
                    <input
                      type="date"
                      value={field.state.value}
                      min={minDate}
                      max={maxDate}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="cursor-pointer file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive [color-scheme:dark]"
                      style={{
                        colorScheme: 'dark'
                      }}
                    />
                    
                    {/* Preset Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {presets.map((preset) => {
                        const isActive = isPresetActive(preset.minutes)
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setPresetDate(preset.minutes)}
                            className={`px-3 py-1.5 cursor-pointer text-xs rounded-md transition-colors ${
                              isActive
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                          >
                            {preset.label}
                          </button>
                        )
                      })}
                    </div>

                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                      <div className="text-red-500 mt-1">
                        {field.state.meta.errors.join(', ')}
                      </div>
                    )}
                  </div>
                )
              }}
            </form.AppField>

            {/* Logo - Not using AppField as file input needs special handling */}
            <div className="space-y-2">
              <label className="mb-2 text-xl font-bold block">Campaign Logo (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              />
            </div>

            <div className="pt-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <form.AppForm>
                  <form.SubscribeButton label="Create Campaign" />
                </form.AppForm>
                
                <form.Subscribe
                  selector={(state) => [state.values.rafflePercentage, state.values.goalAmount]}
                  children={([rafflePercentage, goalAmount]) => {
                    // Handle both string and number types, convert to integer
                    let rafflePercent = 0
                    if (typeof rafflePercentage === 'number') {
                      rafflePercent = Math.floor(rafflePercentage)
                    } else if (typeof rafflePercentage === 'string' && rafflePercentage !== '') {
                      rafflePercent = parseInt(rafflePercentage) || 0
                    }
                    
                    const goalAmountStr = typeof goalAmount === 'string' ? goalAmount : '0'
                    const goal = parseFloat(goalAmountStr) || 0
                    const raffleAmount = (goal * rafflePercent) / 100
                    const creatorAmount = goal - raffleAmount
                    
                    if (goal > 0 && rafflePercent > 0) {
                      return (
                        <div className="text-sm text-muted-foreground text-right">
                          <p>
                            <span className="font-medium">{rafflePercent}%</span> ({raffleAmount.toFixed(4)} ETH) will go to the raffle
                          </p>
                          <p>
                            You will receive <span className="font-medium">{creatorAmount.toFixed(4)} ETH</span>
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

