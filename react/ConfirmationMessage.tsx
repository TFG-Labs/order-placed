/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
import React, { FC, useState, useEffect } from 'react'
import { FormattedMessage } from 'react-intl'
import { useCssHandles } from 'vtex.css-handles'
import { canUseDOM } from 'vtex.render-runtime'

import { useOrderGroup } from './components/OrderGroupContext'
import { FurnitureNote } from './FurnitureNote'
import { getCookie, hasFurnitureDelivery } from './utils/functions'
import { appHomeProd, appHomeStaging } from './utils'
import { pushPayEvent } from './utils/events'
import { useOrder } from './components/OrderContext'

const CSS_HANDLES = [
  'confirmationMessage',
  'continueShoppingButton',
  'confirmationContainer',
]

const ConfirmationMessage: FC = () => {
  const handles = useCssHandles(CSS_HANDLES)
  const orderGroup = useOrderGroup()
  const { totals, value: totalValue, orderId } = useOrder()
  const shippingFee =
    totals.find((total) => total.id === 'Shipping')?.value ?? 0

  const [isApp, setIsApp] = useState(false)

  useEffect(() => {
    const isAppCookie = getCookie('is_app')
    setIsApp(isAppCookie === 'true')
  }, [])

  const track = () => {
    if (!canUseDOM) return

    const isBashPay = document?.cookie?.includes('bashpaybeta=true')
    const isHeadlessCheckout = document?.cookie?.includes(
      'bash_checkout_beta=true'
    )

    pushPayEvent({
      event: 'purchase',
      value: totalValue ? totalValue / 100 : 0,
      transaction_id: orderId ?? '',
      shipping: shippingFee ? shippingFee / 100 : 0,
      event_description: 'Bash Purchase Event',
      is_bash_pay: isBashPay,
      is_headless_checkout: isHeadlessCheckout,
    })
  }

  useEffect(() => {
    window.addEventListener('gtm_load', track)

    return () => {
      window.removeEventListener('gtm_load', track)
    }
  }, [])

  const handleClick = () => {
    if (typeof window === 'undefined') {
      return
    }

    const redirectUrl = window.location.hostname.includes('staging')
      ? appHomeStaging
      : appHomeProd
    window.location.replace(redirectUrl)
  }

  const shippingMethod =
    orderGroup.orders[0].pickUpParcels.length > 0 ? 'collect' : 'deliver'

  const hasFurniture = hasFurnitureDelivery(orderGroup)

  return (
    <div className={`${handles.confirmationContainer}`}>
      <p
        className={`${handles.confirmationMessage} mt5 t-body tc c-muted-1 lh-copy`}
      >
        {orderGroup.orders[0].clientProfileData.customerEmail ? (
          <FormattedMessage
            id="store/header.email"
            values={{
              lineBreak: <br />,
              userEmail: (
                <strong className="nowrap">
                  {orderGroup.orders[0].clientProfileData.customerEmail}
                </strong>
              ),
            }}
          />
        ) : (
          <FormattedMessage
            id="store/header.phone"
            values={{
              lineBreak: <br />,
              phone: (
                <strong className="nowrap">
                  {orderGroup.orders[0].clientProfileData.phone}
                </strong>
              ),
            }}
          />
        )}
      </p>
      {isApp && (
        <button
          className={handles.continueShoppingButton}
          onClick={handleClick}
        >
          Continue shopping
        </button>
      )}
      {hasFurniture && shippingMethod !== 'collect' ? (
        <FurnitureNote shippingMethod={shippingMethod} />
      ) : null}
    </div>
  )
}

export default ConfirmationMessage
