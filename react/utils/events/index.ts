/* eslint-disable no-console */

import EventAnalytics from './EventAnalytics'
import { DataLayerObject } from './types'

export function getCookieValue(name: string) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const lastPart = parts.pop()
    if (lastPart) {
      return lastPart.split(';').shift()
    }
  }

  return undefined
}

export function setCookieValue(
  cookieName: string,
  cookieValue: string | undefined,
  days: number
) {
  if (!cookieValue) return

  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  const expires = `expires=${date.toUTCString()}`
  document.cookie = `${cookieName}=${cookieValue}; ${expires}; path=/`
}

const decodeBase64 = (str: string) => {
  const binaryString = atob(str)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

const getUserId = (
  account: 'thefoschini' | 'thefoschiniqa' = 'thefoschini'
) => {
  const vtexToken = getCookieValue(`VtexIdclientAutCookie_${account}`)

  if (!vtexToken) return null

  const parts = String(vtexToken).split('.')
  const payload = decodeBase64(parts[1])
  const data = JSON.parse(payload.toString())

  const { userId, sub } = data

  return { userId, sub: String(sub)?.split('@')[0] || undefined }
}

/**
 * getCustomerItems
 * @description Get the customer items from ga_data cookie
 * @returns array of items for Google ecommerce events
 */

const getCustomerItems = () => {
  const customerItems = getCookieValue('ga_data')
  if (!customerItems) return []

  try {
    const gaItems = JSON.parse(customerItems)
    return gaItems.items || []
  } catch (e) {
    console.error('Could not parse items')
    console.error({ customerItems, e })
    return []
  }
}

const pushToDataLayer = (
  data: DataLayerObject,
  ecommerce: boolean | undefined = false
) => {
  if (typeof window === 'undefined') return

  let forDataLayer: DataLayerObject = { event: data.event }

  if (ecommerce && !data.ecommerce) {
    delete data.event
    if (data.items) {
      forDataLayer.ecommerce = { impressions: data.items }
      delete data.items
      forDataLayer.ecommerce = { ...forDataLayer.ecommerce, ...data }
    } else {
      forDataLayer.ecommerce = data
    }

    if (forDataLayer.ecommerce.event) delete forDataLayer.ecommerce.event
  } else {
    forDataLayer = data
  }
  if (forDataLayer?.ecommerce) {
    window.dataLayer?.push({ ecommerce: null })
  }

  // Identify user as headless on GTM.
  forDataLayer.is_headless = true

  window.dataLayer?.push(forDataLayer)
}

/**
 * truncateString
 * Truncate a string to a specified length.
 * @param str
 * @param maxLength
 * @returns string
 */
export const truncateString = (str: string, maxLength = 100): string => {
  if (!str) return ''
  return str.length > maxLength ? `${str.slice(0, maxLength - 3)}...` : str
}

export const isMobileDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined')
    return false

  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

  return mobileRegex.test(navigator?.userAgent)
}

export const pushPayEvent = (
  eventData: DataLayerObject,
  account: 'thefoschini' | 'thefoschiniqa' = 'thefoschini'
) => {
  if (!eventData) return

  const isMobile = isMobileDevice()
  const analytics = new EventAnalytics(3000, 3, account)
  const isApp = document?.cookie.includes('is_app=true')
  const isHeadlessCheckout =
    !isApp && document?.cookie.includes('bash_checkout_beta=true')

  let transformedEventData: { [key: string]: string | object } = {
    eventCategory: 'Payments',
    eventAction: eventData.event_action?.replace(/\s/g, '_'),
    eventLabel: eventData.event_label || 'Pay_Event',
    eventDescription: eventData.event_description || 'Pay Event',
    event_params: {
      is_bash_pay: 'true',
      is_webview: isApp,
      is_headless_checkout: isHeadlessCheckout ? 'true' : undefined,
    },
  }

  eventData.event_description = truncateString(eventData.event_description, 100)

  if (eventData.event_detail) {
    transformedEventData.eventDescription = JSON.stringify(
      eventData.event_detail
    )
    if (eventData.event_detail?.error) {
      transformedEventData.eventDescription = JSON.stringify(
        eventData.event_detail.error
      )
    }
  }

  const items = getCustomerItems()

  // For E-commerce event.
  if (eventData.event && eventData.event !== 'gaEvent') {
    transformedEventData = {
      event: eventData.event,
      ecommerce: {
        ...eventData,
        currency: 'ZAR',
        items,
        user_id: getUserId()?.sub ?? undefined,
      },
      is_bash_pay: 'true',
      ...(isHeadlessCheckout ? { is_headless_checkout: 'true' } : {}),
    }
  } else {
    transformedEventData.event = 'gaEvent'
  }

  // If the event is not a GA event, send it to the mobile analytics endpoint.
  // After renaming events due to popular demand, we discovered that GA Web
  // does not like events that are not named 'gaEvent'.
  if (isApp || transformedEventData.event !== 'gaEvent') {
    const eventForAnalytics = {
      name: transformedEventData.event,
      params: {
        ...((transformedEventData.ecommerce as object) || {}),
        ...Object.keys(transformedEventData).reduce((acc, item) => {
          if (item !== 'user_id' && item !== 'event' && item !== 'ecommerce') {
            return { ...acc, [item]: transformedEventData[item] }
          }
          return acc
        }, {}),
      },
    }

    analytics.trackEvent(eventForAnalytics)

    // Don't push to the dataLayer as well for regular GTM.
    return
  }

  transformedEventData.event_params = {
    ...(transformedEventData.event_params as object),
    is_bash_pay: 'true',
    is_webview: isApp,
    is_headless_checkout: isHeadlessCheckout ? 'true' : undefined,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BashPayObject = (window as any)?.BashPay

  const message = JSON.stringify(transformedEventData)

  if (BashPayObject) {
    BashPayObject.postMessage(message)
  } else {
    window.parent.postMessage(message, '*')
  }

  pushToDataLayer({
    event: 'gaEvent',
    platform: isMobile ? 'Mobi' : 'Web',
    ...transformedEventData,
  })
}
