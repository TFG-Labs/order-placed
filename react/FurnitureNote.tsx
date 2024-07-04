import React from 'react'
import { useCssHandles } from 'vtex.css-handles'

interface FurnitureNoteProps {
  shippingMethod: string
}

const CSS_HANDLES = [
  'confirmationMessage',
  'furnitureNote',
  'confirmationContainer',
  'noteLink',
  'noteTitle',
]

const deliveryMessage = `
  we’ll call the recipient in the next few days to arrange the furniture
  delivery.
  <br/>
  <br/>
  Please ensure sufficient space to receive the goods and keep in
  mind that the couriers can’t hoist goods onto balconies.
  <br/>
`

const collectMessage = `
  We’ll call the recipient to book a collection time with the warehouse.
`

export const FurnitureNote = ({ shippingMethod }: FurnitureNoteProps) => {
  const handles = useCssHandles(CSS_HANDLES)

  return (
    <div className={`${handles.furnitureNote}`}>
      <h4 className={`${handles.noteTitle}`}>Furniture delivery</h4>
      {/* using dangerouslySetInnerHTML because the <br/> tags were not being added previously */}
      <p dangerouslySetInnerHTML={{ __html: shippingMethod === 'deliver' ? deliveryMessage : collectMessage }} />
      <a href="https://help.bash.com/support/solutions" className={handles.noteLink}>
        Frequently asked questions
      </a>
    </div>
  )
}
