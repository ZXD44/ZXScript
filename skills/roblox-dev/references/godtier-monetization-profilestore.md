# God-Tier Monetization & Bulletproof Data Persistence
> **Target Engine:** Roblox Studio 0.744+ | Luau 0.743+
> **Library:** ProfileStore / ProfileService Standard + MarketplaceService Idempotency

---

## 1. Golden Rules of Player Data & Purchases
1. **Never Save on Every Coin Pickup:** Always cache in memory and auto-save periodically (every 5 minutes) or on `PlayerRemoving`.
2. **Session Locking:** Prevent multi-server dupes and data loss by acquiring a session lock when a player joins and releasing it when they leave.
3. **Idempotent ProcessReceipt:** `ProcessReceipt` can fire multiple times for a single purchase. The server MUST store `PurchaseId` in the player's saved data to ensure products are never granted twice, and return `Enum.ProductPurchaseDecision.PurchaseGranted` only when saved successfully.

---

## 2. Idempotent Developer Product Handler (`ReceiptProcessor.luau`)

```luau
--!strict
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")

local PRODUCT_HANDLERS = {
    [12345678] = function(player: Player): boolean
        -- Grant 1,000 Coins
        local leaderstats = player:FindFirstChild("leaderstats")
        local coins = leaderstats and leaderstats:FindFirstChild("Coins") :: IntValue?
        if coins then
            coins.Value += 1000
            return true
        end
        return false
    end,
}

MarketplaceService.ProcessReceipt = function(receiptInfo)
    local player = Players:GetPlayerByUserId(receiptInfo.PlayerId)
    if not player then
        -- Player left before receipt finished processing; keep as NotProcessedYet so Roblox retries on next join
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end

    local handler = PRODUCT_HANDLERS[receiptInfo.ProductId]
    if not handler then
        warn(`[ProcessReceipt] Unhandled ProductId: {receiptInfo.ProductId}`)
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end

    local success, granted = pcall(handler, player)
    if success and granted then
        return Enum.ProductPurchaseDecision.PurchaseGranted
    else
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end
end
```
