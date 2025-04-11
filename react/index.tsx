import React, { FC, useEffect, useState } from 'react'
import { useQuery } from 'react-apollo'
import { useIntl, defineMessages } from 'react-intl'
import { Helmet, ExtensionPoint, useRuntime } from 'vtex.render-runtime'
import { usePWA } from 'vtex.store-resources/PWAContext'
import { useCssHandles } from 'vtex.css-handles'

import { OrderGroupContext } from './components/OrderGroupContext'
import { CurrencyContext } from './components/CurrencyContext'
import ForbiddenError from './components/Errors/ForbiddenError'
import InvalidError from './components/Errors/InvalidError'
import OrderList from './components/OrderList'
import Skeleton from './Skeleton'
import Analytics from './Analytics'
import { useGetCustomerEmail } from './hooks/useGetCustomerEmail'
import GET_ORDER_GROUP from './graphql/getOrderGroup.graphql'
import type { NoticeType } from './hooks/useGetNotices'
import useGetNotices from './hooks/useGetNotices'
import Notice from './components/Notice'
import './styles.css'
import { getCookie } from './utils/functions'
import { gaMeasurementId } from './utils'
import { isMobileDevice } from './utils/events'
import GenericSuccess from './GenericSuccess'

interface OrderGroupData {
  orderGroup: OrderGroup
}

const messages = defineMessages({
  title: { id: 'store/page.title', defaultMessage: '' },
})

const CSS_HANDLES = ['orderPlacedWrapper', 'orderPlacedMainWrapper']

const OrderPlaced: FC = () => {
  const handles = useCssHandles(CSS_HANDLES)
  const { formatMessage } = useIntl()
  const runtime = useRuntime()
  const { settings = {} } = usePWA() || {}
  const [installDismissed, setInstallDismissed] = useState(false)
  const [isApp, setIsApp] = useState(false)
  const [canGetCookies, setCanGetCookies] = useState(false)

  const orderNumber = runtime.query.og

  const { data, loading, error } = useQuery<OrderGroupData>(GET_ORDER_GROUP, {
    variables: {
      orderGroup: orderNumber,
    },
  })

  const { customerEmail, customerEmailLoading } = useGetCustomerEmail(
    data?.orderGroup.orders[0].clientProfileData.email
  )

  const notices = useGetNotices()

  const handleGtagInitialization = () => {
    if (typeof window !== 'undefined' && window.dataLayer && !window.gtag) {
      window.gtag = function () {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer.push(arguments)
      }

      const isMobile = isMobileDevice()
      const webPlatform = isMobile ? 'Mobi' : 'Web'

      const userProperties = {
        platform_type: document.cookie.includes('is_app=true')
          ? 'App'
          : webPlatform,
      }

      if (document.cookie.includes('bash_checkout_beta=true')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(userProperties as any).is_headless_checkout = true
      }

      window.gtag('js', new Date())
      window.gtag('config', gaMeasurementId, {
        user_properties: userProperties,
      })
    }

    window.dispatchEvent(new Event('gtag_loaded'))
  }

  useEffect(() => {
    const isAppCookie = getCookie('is_app')
    setIsApp(!!isAppCookie)

    if (
      document.cookie?.includes('is_app') || // from app journey
      document.cookie?.includes('session_id') // from web journey
    ) {
      setCanGetCookies(true)
    } else {
      // If there's no session_id,
      // it also means it's Android with blocked cookies,
      // hence hide the nav bar.
      setIsApp(true)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Google Analytics Setup
  useEffect(() => {
    handleGtagInitialization()
    window.addEventListener('gtm.js', handleGtagInitialization)

    return () => {
      window.removeEventListener('gtm.js', handleGtagInitialization)
    }
  }, [])

  useEffect(() => {
    console.error(error)
  }, [error])

  // render loading skeleton if query is still loading
  if (canGetCookies && (loading || customerEmailLoading)) return <Skeleton />
  if (loading || customerEmailLoading)
    return <GenericSuccess orderNumber={orderNumber} />

  // forbidden error
  if (
    error?.message.includes('403') ||
    // 'any' needed because graphql error type doesn't have 'extensions' prop
    (error as any)?.extensions?.response?.status === 403
  ) {
    return <ForbiddenError />
  }

  // not found error
  if (data?.orderGroup?.orders == null) {
    return <InvalidError />
  }

  const { orderGroup }: { orderGroup: OrderGroup } = {
    ...data,
  }

  orderGroup.orders[0].clientProfileData.customerEmail = customerEmail

  const { promptOnCustomEvent } = settings

  const overallNotice = notices.find(
    (notice: NoticeType) => notice.slotName === 'ORDER_COMPLETE_OVERALL'
  )

  return (
    <OrderGroupContext.Provider value={orderGroup}>
      <CurrencyContext.Provider
        value={orderGroup.orders[0].storePreferencesData.currencyCode}
      >
        <Helmet>
          <title>{formatMessage(messages.title)}</title>
        </Helmet>

        <div className={`${handles.orderPlacedWrapper} pt9 sans-serif`}>
          <Analytics eventList={orderGroup.analyticsData} />

          <ExtensionPoint id="op-header" />

          <div
            role="main"
            className={`${handles.orderPlacedMainWrapper} mv6 w-80-ns w-90 center`}
          >
            {overallNotice && (
              <Notice level={overallNotice.level}>
                {overallNotice.content}
              </Notice>
            )}

            <OrderList />

            {promptOnCustomEvent === 'checkout' && !installDismissed && (
              <ExtensionPoint
                id="promotion-banner"
                type="install"
                onDismiss={() => setInstallDismissed(true)}
              />
            )}
          </div>

          {!isApp && <ExtensionPoint id="op-footer" />}
        </div>
      </CurrencyContext.Provider>
    </OrderGroupContext.Provider>
  )
}

export default OrderPlaced
