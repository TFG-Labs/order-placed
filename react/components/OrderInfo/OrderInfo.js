import React, { Fragment } from 'react'
import PropTypes from 'prop-types'
import parcelify from '@vtex/delivery-packages'
import OrderHeader from './OrderHeader'
import CustumerInfo from './CustumerInfo'
import PaymentSummary from '../Payment/PaymentSummary'
import Shipping from '../Shipping/Shipping'
import OrderTotal from './OrderTotal'
import StorePickUp from '../StorePickUp/StorePickUp'
import OrderSplitNotice from './OrderSplitNotice'
import OrderSection from './OrderSection'
import { profileShape } from '../../proptypes/shapes'

const OrderInfo = ({ data, profile }) => {
  const parcels = parcelify(data)
  const delivery = parcels.filter((deliveryPackage) => deliveryPackage.deliveryChannel === 'delivery')
  const pickup = parcels.filter((pickupPackage) => pickupPackage.deliveryChannel === 'pickup-in-point')
  const takeaway = parcels.filter((takeawayPackage) => takeawayPackage.deliveryChannel === 'takeaway')
  const multipleDeliveries = (delivery.length > 1)
  return (
    <Fragment>
      <div className="mv6 w-80-ns w-90 center">
        <OrderHeader orderInfo={data} />
        {
          multipleDeliveries &&
          <OrderSplitNotice
            deliveries={delivery.length}
            pickups={pickup.length}
            takeaways={takeaway.length}
          />
        }
        <CustumerInfo profile={profile} />
        <OrderSection>
          <PaymentSummary paymentsData={data.paymentData.transactions[0].payments} />
        </OrderSection>
        {
          (pickup.length > 0) &&
          (<OrderSection>
            <StorePickUp pickUpPackages={pickup} />
          </OrderSection>)
        }
        {
          (delivery.length > 0) &&
          (<OrderSection>
            <Shipping deliveryPackages={delivery} />
          </OrderSection>)
        }
        <OrderTotal
          items={data.items}
          totals={data.totals}
          orderValue={data.value}
        />
      </div>
      <hr className="bg-muted-4 bt b--muted-4" />
    </Fragment>
  )
}

OrderInfo.propTypes = {
  data: PropTypes.object.isRequired,
  profile: profileShape.isRequired,
}

export default OrderInfo
