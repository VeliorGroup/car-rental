'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface BookingEvent {
  id: string
  title: string
  start: Date
  end: Date
  resourceId: string
  status: string
  allDay: boolean
}

export default function BookingsCalendarPage() {
  const router = useRouter()
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState<View>(Views.MONTH)

  const { data: events, isLoading } = useQuery({
    queryKey: ['bookings-calendar', date, view],
    queryFn: async () => {
      // Calculate start and end dates based on current view
      const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString()

      const response = await api.get('/bookings', {
        params: {
          startFrom: start,
          endTo: end,
          limit: 1000, // Fetch all bookings for the month
        },
      })

      return response.data.bookings.map((booking: any) => {
        const startDate = new Date(booking.startDate)
        const endDate = new Date(booking.endDate)
        // For react-big-calendar, end date should be exclusive (the day AFTER the last day)
        // Also add 1 day to make multi-day events span properly
        endDate.setDate(endDate.getDate() + 1)
        
        return {
          id: booking.id,
          title: `${booking.vehicle.brand} ${booking.vehicle.model} - ${booking.customer.firstName} ${booking.customer.lastName}`,
          start: startDate,
          end: endDate,
          resourceId: booking.vehicleId,
          status: booking.status,
          allDay: true, // This makes multi-day events span as bars
        }
      })
    },
  })

  const eventStyleGetter = (event: BookingEvent) => {
    let backgroundColor = '#3174ad'
    if (event.status === 'CONFIRMED') backgroundColor = '#2563eb'
    if (event.status === 'CHECKED_OUT') backgroundColor = '#16a34a'
    if (event.status === 'CHECKED_IN') backgroundColor = '#4b5563'
    if (event.status === 'CANCELLED') backgroundColor = '#dc2626'

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.8rem',
        whiteSpace: 'normal', // Allow text wrapping
        height: 'auto', // Allow height to grow
        minHeight: '100%',
      },
    }
  }

  const handleSelectEvent = (event: BookingEvent) => {
    router.push(`/bookings/${event.id}`)
  }

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/bookings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Bookings Calendar</h2>
        </div>
        <Link href="/bookings/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </Link>
      </div>

      <div className="flex-1 bg-card rounded-md border p-4">
        <Calendar
          localizer={localizer}
          events={events || []}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          views={['month', 'week', 'day']}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
          tooltipAccessor="title"
          popup
          components={{
            event: ({ event }: any) => (
              <div className="p-1 text-xs leading-tight">
                <div className="font-bold">{event.title.split(' - ')[0]}</div>
                <div>{event.title.split(' - ')[1]}</div>
              </div>
            ),
          }}
        />
      </div>
    </div>
  )
}