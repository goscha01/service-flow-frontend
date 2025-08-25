import React from 'react'
import { formatPhoneNumber } from "../utils/phoneFormatter"

const BookingConfirmationEmail = ({ booking, businessInfo }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A'
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#f8f9fa' }}>
      {/* Email Container */}
      <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            backgroundColor: '#3b82f6', 
            color: '#ffffff', 
            padding: '20px', 
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h1 style={{ margin: '0', fontSize: '24px', fontWeight: 'bold' }}>
              {businessInfo?.business_name || 'Service Booking'}
            </h1>
            <p style={{ margin: '10px 0 0 0', fontSize: '16px', opacity: '0.9' }}>
              Booking Confirmation
            </p>
          </div>
        </div>

        {/* Greeting */}
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#1f2937', fontSize: '20px', marginBottom: '10px' }}>
            Hi {booking.customerData?.firstName || 'there'},
          </h2>
          <p style={{ color: '#6b7280', fontSize: '16px', lineHeight: '1.6' }}>
            Thank you for booking with us! Your appointment has been confirmed and we're looking forward to serving you.
          </p>
        </div>

        {/* Booking Details */}
        <div style={{ 
          backgroundColor: '#f8fafc', 
          padding: '25px', 
          borderRadius: '8px', 
          border: '1px solid #e2e8f0',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#1f2937', fontSize: '18px', marginBottom: '20px', fontWeight: 'bold' }}>
            📅 Booking Details
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>
                Booking ID
              </p>
              <p style={{ color: '#1f2937', fontSize: '16px', margin: '0' }}>
                #{booking.id || 'BK-' + Math.random().toString(36).substr(2, 9).toUpperCase()}
              </p>
            </div>
            
            <div>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>
                Date
              </p>
              <p style={{ color: '#1f2937', fontSize: '16px', margin: '0' }}>
                {formatDate(booking.scheduledDate)}
              </p>
            </div>
            
            <div>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>
                Time
              </p>
              <p style={{ color: '#1f2937', fontSize: '16px', margin: '0' }}>
                {formatTime(booking.scheduledTime)}
              </p>
            </div>
            
            <div>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>
                Total Amount
              </p>
              <p style={{ color: '#1f2937', fontSize: '16px', margin: '0', fontWeight: 'bold' }}>
                {formatCurrency(booking.totalAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* Services */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#1f2937', fontSize: '18px', marginBottom: '15px', fontWeight: 'bold' }}>
            🛠️ Services Booked
          </h3>
          
          {booking.services?.map((service, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '15px 0',
              borderBottom: index < booking.services.length - 1 ? '1px solid #e5e7eb' : 'none'
            }}>
              <div>
                <p style={{ color: '#1f2937', fontSize: '16px', margin: '0 0 5px 0', fontWeight: '500' }}>
                  {service.name}
                </p>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: '0' }}>
                  Quantity: {service.quantity}
                </p>
              </div>
              <p style={{ color: '#1f2937', fontSize: '16px', margin: '0', fontWeight: 'bold' }}>
                {formatCurrency(service.price * service.quantity)}
              </p>
            </div>
          ))}
        </div>

        {/* Customer Information */}
        <div style={{ 
          backgroundColor: '#f8fafc', 
          padding: '25px', 
          borderRadius: '8px', 
          border: '1px solid #e2e8f0',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#1f2937', fontSize: '18px', marginBottom: '15px', fontWeight: 'bold' }}>
            👤 Your Information
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>
                Name
              </p>
              <p style={{ color: '#1f2937', fontSize: '16px', margin: '0' }}>
                {booking.customerData?.firstName} {booking.customerData?.lastName}
              </p>
            </div>
            
            <div>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>
                Email
              </p>
              <p style={{ color: '#1f2937', fontSize: '16px', margin: '0' }}>
                {booking.customerData?.email}
              </p>
            </div>
            
            <div>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>
                Phone
              </p>
              <p style={{ color: '#1f2937', fontSize: '16px', margin: '0' }}>
                {booking.customerData?.phone ? formatPhoneNumber(booking.customerData.phone) : 'Not provided'}
              </p>
            </div>
            
            <div>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>
                Address
              </p>
              <p style={{ color: '#1f2937', fontSize: '16px', margin: '0' }}>
                {booking.customerData?.address || 'Not provided'}
              </p>
            </div>
          </div>
          
          {booking.customerData?.notes && (
            <div style={{ marginTop: '15px' }}>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>
                Special Instructions
              </p>
              <p style={{ color: '#1f2937', fontSize: '16px', margin: '0' }}>
                {booking.customerData.notes}
              </p>
            </div>
          )}
        </div>

        {/* Business Information */}
        <div style={{ 
          backgroundColor: '#eff6ff', 
          padding: '25px', 
          borderRadius: '8px', 
          border: '1px solid #dbeafe',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#1e40af', fontSize: '18px', marginBottom: '15px', fontWeight: 'bold' }}>
            🏢 Contact Information
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <p style={{ color: '#1e40af', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>
                Business
              </p>
              <p style={{ color: '#1e40af', fontSize: '16px', margin: '0' }}>
                {businessInfo?.business_name || 'Our Service'}
              </p>
            </div>
            
            <div>
              <p style={{ color: '#1e40af', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>
                Phone
              </p>
              <p style={{ color: '#1e40af', fontSize: '16px', margin: '0' }}>
                {businessInfo?.phone || 'Contact us'}
              </p>
            </div>
            
            <div>
              <p style={{ color: '#1e40af', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>
                Email
              </p>
              <p style={{ color: '#1e40af', fontSize: '16px', margin: '0' }}>
                {businessInfo?.email || 'info@service.com'}
              </p>
            </div>
            
            <div>
              <p style={{ color: '#1e40af', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>
                Address
              </p>
              <p style={{ color: '#1e40af', fontSize: '16px', margin: '0' }}>
                {businessInfo?.address || 'Service area'}
              </p>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div style={{ 
          backgroundColor: '#fef3c7', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #f59e0b',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#92400e', fontSize: '16px', marginBottom: '10px', fontWeight: 'bold' }}>
            ⚠️ Important Information
          </h3>
          <ul style={{ color: '#92400e', fontSize: '14px', margin: '0', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '5px' }}>
              Please ensure someone is available at the scheduled time
            </li>
            <li style={{ marginBottom: '5px' }}>
              We'll arrive within 15 minutes of the scheduled time
            </li>
            <li style={{ marginBottom: '5px' }}>
              Contact us immediately if you need to reschedule or cancel
            </li>
            <li style={{ marginBottom: '0' }}>
              Payment will be collected upon completion of service
            </li>
          </ul>
        </div>

        {/* Call to Action */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <a href="#" style={{
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            padding: '15px 30px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'inline-block'
          }}>
            View Booking Details
          </a>
        </div>

        {/* Footer */}
        <div style={{ 
          borderTop: '1px solid #e5e7eb', 
          paddingTop: '20px', 
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          <p style={{ margin: '0 0 10px 0' }}>
            Thank you for choosing {businessInfo?.business_name || 'our service'}!
          </p>
          <p style={{ margin: '0', fontSize: '12px' }}>
            This is an automated confirmation email. Please do not reply to this message.
          </p>
        </div>
      </div>
    </div>
  )
}

export default BookingConfirmationEmail 