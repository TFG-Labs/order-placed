/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */

import { getCookieValue, isMobileDevice } from '.'
import { gaMeasurementId } from '../constants'

class EventAnalytics {
  public endpoint: string
  public account: string
  public buffer: any[]
  public flushInterval: number
  public retries: number
  public maxRetries: number
  public clientId?: string
  public sessionId?: string
  private isApp: boolean
  constructor(flushInterval = 3000, maxRetries = 3, account = 'thefoschini') {
    this.endpoint =
      account === 'thefoschini'
        ? 'https://web-api.bash.com/v1/analytics/collect'
        : 'https://web-api.staging.tfglabs.dev/v1/analytics/collect'
    this.account = account
    this.buffer = []
    this.flushInterval = flushInterval
    this.retries = 0
    this.maxRetries = maxRetries
    this.isApp = getCookieValue('is_app') === 'true'
    this.sessionId = getCookieValue('session_id')
    this.clientId = getCookieValue('client_id')

    // Start the interval to periodically send the buffered events
    setInterval(() => this.flush(), this.flushInterval)
  }

  public trackEvent(event: any) {
    this.buffer.push(event)
    this.postMessage(event)
    if (this.buffer.length === 1) {
      this.flush()
    }
  }

  public postMessage(event: any) {
    if (!event || !event.name) return

    const BashPayObject = (window as any)?.BashPay

    const message = JSON.stringify(event)

    if (BashPayObject) {
      console.info('📈 BashPayObject.postMessage for Event')
      BashPayObject.postMessage(message)
    } else {
      console.info('📈 window.parent.postMessage for Event')
      window.parent.postMessage(message, '*')
    }
  }

  private getAppAnalyticsCookieData() {
    if (typeof document === 'undefined') {
      return {}
    }

    const cookieData = decodeURIComponent(
      getCookieValue('app_analytics_data') ?? ''
    )

    if (!cookieData) return {}

    try {
      // Sometimes we get the cookie with single quotes.
      if (cookieData.startsWith("'") && cookieData.endsWith("'")) {
        const sanitizedCookieData = cookieData.slice(1, -1)
        return JSON.parse(sanitizedCookieData)
      }

      return JSON.parse(cookieData)
    } catch (e) {
      console.error(`Error parsing app_analytics_data cookie ${e}`)
      return {}
    }
  }

  private async getWebTrackingConfig() {
    // Platform is App
    if (this.isApp) {
      return Promise.resolve({})
    }

    const isBashPay = document?.cookie.includes('bashpaybeta=true')
    const isMobile = isMobileDevice()
    const platform = isMobile ? 'Mobi' : 'Web'

    if (this.clientId && this.sessionId)
      return Promise.resolve({
        platform,
        clientId: this.clientId,
        sessionId: this.sessionId,
        feature_flag_parameters: [isBashPay ? 'is_bash_pay' : ''],
      })

    if (typeof window.gtag !== 'function') {
      console.warn('🕸️ Web Analytics: GTM is not ready / configured.')
      return Promise.resolve({})
    }

    const clientIdPromise = new Promise<void>((resolve) => {
      if (this.clientId) {
        resolve()
      }
      window.gtag('get', gaMeasurementId, 'client_id', (id: string) => {
        this.clientId = id
        console.info(this.clientId)
        resolve()
      })
    })

    const sessionIdPromise = new Promise<void>((resolve) => {
      if (this.sessionId) {
        resolve()
      }
      window.gtag('get', gaMeasurementId, 'session_id', (id: string) => {
        this.sessionId = id
        console.info(this.sessionId)
        resolve()
      })
    })

    // Wait for both clientId and sessionId to be retrieved
    await Promise.all([clientIdPromise, sessionIdPromise])

    return {
      platform,
      clientId: this.clientId,
      sessionId: this.sessionId,
      feature_flag_parameters: [isBashPay ? 'is_bash_pay' : ''],
    }
  }

  private async flush() {
    if (this.buffer.length === 0 || this.retries >= this.maxRetries) {
      return
    }

    const eventsToSend = [...this.buffer]
    this.buffer = []

    const cookieData = this.getAppAnalyticsCookieData()
    const webData = await this.getWebTrackingConfig()
    const isFacebook = this.isApp && getCookieValue(`swv`) === 'true' && eventsToSend.some(event => event.name === 'purchase')

    const body = JSON.stringify({
      ...(isFacebook ? { fbEvents: true } : {}),
      ...cookieData,
      ...webData,
      events: eventsToSend,
    })

    // For App, there must be an app instance id
    if (this.isApp && !cookieData.appInstanceId) {
      console.warn('📱 Mobile Analytics: No app instance id found')
      return
    }
    // For Web, there must be a client id
    if (!this.isApp && this.endpoint && !this.clientId) {
      console.warn('🕸️ Web Analytics: No client id found')
      return
    }

    try {
      if (this.endpoint) {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        }


        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers,
          credentials: 'include',
          body,
        })

        if (!response.ok) {
          // If the request fails, re-add the events back to the buffer
          this.retries += 1
          this.buffer.push(...eventsToSend)
        } else {
          this.retries = 0
        }
      } else {
        console.info('📈 Events Analytics: Events sent', eventsToSend)
        this.retries = 0
      }
    } catch (error) {
      // If an error occurs, re-add the events back to the buffer

      if (this.endpoint) {
        console.info('📈 Events Analytics: Attempted to send ', {
          retries: this.retries,
          body: {
            ...cookieData,
            ...webData,
            events: eventsToSend,
          },
        })
        this.buffer.push(...eventsToSend)
        this.retries += 1
      }
    }
  }
}

export default EventAnalytics
