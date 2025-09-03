// This is necessary to make this file a module augmentation
// and not a new module declaration.
export {}

declare module '@aptos-labs/ts-sdk' {
  interface Aptos {
    /**
     * Sets the global ledger version for all future view/getAccountResource calls.
     * This is a global setting and will be used only when you want to view data at a specific ledger version.
     * To reset to the latest version, set the value to undefined.
     *
     * @example
     * const aptos = useAptos();
     * aptos.setLedgerVersion(3151821422); // sets global ledger version
     * const balance = await fetchFungibleBalance(userAddress, aptosFA);
     * aptos.setLedgerVersion(undefined); // resets to latest version
     */
    setLedgerVersion?: (value: number | undefined) => void
    /**
     * Gets the global ledger version used for all the calls which does not set explicit ledger version on
     * view/getAccountResource calls.
     * To reset to the latest version, call setLedgerVersion with undefined.
     *
     * @example
     * const aptos = useAptos();
     * const ledgerVersion = aptos.getLedgerVersion();
     */
    getLedgerVersion?: () => number | undefined
  }
}
