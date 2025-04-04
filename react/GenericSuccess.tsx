import React, { FC, useEffect } from 'react'
import { useCssHandles } from 'vtex.css-handles'

import { SuccessImage } from './Icons/SuccessImage'
import { appHomeProd, appHomeStaging } from './utils'

const CSS_HANDLES = [
  'confirmationMessage',
  'continueShoppingButton',
  'confirmationContainer',
]

const GenericSuccess: FC<{ orderNumber: string }> = ({ orderNumber }) => {
  const handles = useCssHandles(CSS_HANDLES)

  const handleClick = () => {
    if (typeof window === 'undefined') return

    const redirectUrl = window.location.hostname.includes('staging')
      ? appHomeStaging
      : appHomeProd
    window.location.replace(redirectUrl)
  }

  const formattedDate = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0') // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${year}/${month}/${day} at ${hour}:${min}`
  }

  useEffect(() => {
    const isHeadlessCheckout = document.cookie.includes(
      'bash_checkout_beta=true'
    )

    window?.dataLayer?.push({
      eventCategory: 'Order_Placed_Generic',
      eventAction: 'Order_Placed',
      eventLabel: 'Generic_Success',
      eventDescription:
        'User saw the Generic order confirmation page because cookies were not detected.',
    })

    window?.dataLayer?.push({
      event: 'purchase',
      ecommerce: {
        purchase: {
          actionField: {
            id: orderNumber,
          },
          products: [],
        },
      },
      event_params: {
        ...(isHeadlessCheckout ? { is_headless_checkout: 'true' } : {}),
      },
    })
  }, [orderNumber])

  return (
    <div
      className={`${handles.confirmationContainer}`}
      style={{ margin: '0 auto', textAlign: 'center' }}
    >
      <SuccessImage size={280} />
      <h1 style={{ fontSize: '16px', opacity: '.7' }}>
        Thank you for your purchase
      </h1>
      <h2
        style={{
          lineHeight: 'normal',
          fontWeight: 400,
          width: '90%',
          maxWidth: '480px',
          margin: '0 auto',
          paddingBottom: '16px',
          borderBottom: '1px solid rgb(4 4 4 / 10%) ',
        }}
      >
        <span style={{ opacity: '.5' }}>Order</span>
        <span
          style={{
            display: 'block',
            fontSize: '22px',
            color: '#040404',
            margin: '4px auto',
            fontWeight: 600,
          }}
        >
          {orderNumber}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: '14px',
            color: '#040404',
            fontWeight: 'normal',
          }}
        >
          Placed on {formattedDate()}
        </span>
      </h2>
      <p>You&apos;ll receive an order confirmation email/SMS.</p>
      <p style={{ lineHeight: 'normal', marginBottom: '16px' }}>
        You can track the status of your order <br /> in the Orders section in
        your Profile.
      </p>

      <button
        style={{
          border: 0,
          backgroundColor: '#040404',
          color: '#fff',
          fontSize: '14px',
          padding: '16px',
          borderRadius: '4px',
        }}
        className={handles.continueShoppingButton}
        onClick={handleClick}
      >
        Continue shopping
      </button>
    </div>
  )
}

export default GenericSuccess
