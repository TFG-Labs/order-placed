/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
import { useEffect } from 'react'
import { useRuntime } from 'vtex.render-runtime'

import { pushPayEvent } from '../utils/events'

const useTracking = ({
  event = 'purchase',
  orderTotal,
  orderId,
  shippingFee,
}: {
  event?: string
  orderTotal?: number
  orderId?: string
  shippingFee?: number
}) => {
  const runtime = useRuntime()
  const { account } = runtime

  useEffect(() => {
    console.info({ event })

    pushPayEvent(
      {
        event,
        value: orderTotal ? orderTotal / 100 : 0,
        transaction_id: orderId ?? '',
        shipping: shippingFee ? shippingFee / 100 : 0,
      },
      account
    )
  }, [account, orderTotal])
}

export default useTracking
