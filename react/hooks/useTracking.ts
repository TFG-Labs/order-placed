/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
import { useEffect } from 'react'
import { useRuntime } from 'vtex.render-runtime'

import { pushPayEvent } from '../utils/events'

const useTracking = ({
  event = 'purchase',
  orderTotal,
  orderId,
}: {
  event?: string
  orderTotal?: number
  orderId?: string
}) => {
  const runtime = useRuntime()
  const { account } = runtime

  useEffect(() => {
    pushPayEvent(
      {
        event,
        value: orderTotal ? orderTotal / 100 : 0,
        transaction_id: orderId ?? '',
      },
      account
    )
  }, [account, orderTotal])
}

export default useTracking
