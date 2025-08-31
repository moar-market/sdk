// oxlint-disable no-console
/**
 * Example: Fetching Credit Account Events
 *
 * This example demonstrates how to use the Moar Market SDK to fetch specific events
 * (account creation and account closure) for a given credit account. It shows how to:
 *   1. Import the necessary types and functions from the SDK.
 *   2. Define the credit account address to query.
 *   3. Retrieve the event type map for the credit manager.
 *   4. Fetch all events of the specified types for the credit account.
 *   5. Find the first occurrence of each event type (account created and account closed).
 *   6. Log the results or handle errors.
 */

import type {
  CreditAccountClosedEvent,
  CreditAccountCreatedEvent,
  CreditManagerEventType,
} from '@moar-market/sdk/credit-manager'
import {
  fetchAccountEvents,
  findEventByType,
  getCreditManagerEventTypes,
} from '@moar-market/sdk/credit-manager'

export async function main() {
  // The address of the credit account to query events for
  const creditAccountAddress
    = '0xa3fe764ed5d303071c90977eb4490d5ae49607ad49bc1093335a622f6177ec65'

  // Retrieve the event type map for the credit manager
  const eventTypeMap = getCreditManagerEventTypes()

  try {
    // Specify the event types to fetch: account created and account closed
    const eventTypesToFetch: CreditManagerEventType[] = [
      eventTypeMap.accountCreated,
      eventTypeMap.accountClosed,
    ]

    // Fetch all events of the specified types for the credit account
    const events = await fetchAccountEvents<
      CreditAccountCreatedEvent | CreditAccountClosedEvent
    >(creditAccountAddress, eventTypesToFetch)

    // Find the first occurrence of the account created event with proper type
    const accountCreatedEvent = findEventByType<CreditAccountCreatedEvent>(
      events,
      eventTypeMap.accountCreated,
    )

    // Find the first occurrence of the account closed event with proper type
    const accountClosedEvent = findEventByType<CreditAccountClosedEvent>(
      events,
      eventTypeMap.accountClosed,
    )

    // Log the results
    console.log({
      accountCreatedEvent,
      accountClosedEvent,
    })
  }
  catch (error) {
    // Handle errors in fetching or processing events
    console.error('Failed to fetch events:', error)
  }
}

main()
