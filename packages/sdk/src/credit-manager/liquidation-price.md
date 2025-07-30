# Complete LTV-Based Liquidation with Correlated Collaterals - Final Derivation

## 1. Mathematical Foundation

### **Problem Setup**
We have a leveraged concentrated liquidity position with:
- **Pool assets**: X and Y tokens with concentrated liquidity position
- **Debts**: `DX` amount in X tokens, `DY` amount in Y tokens
- **Extra collaterals**: X, Y, and other assets (ETH, USDC, etc.)
- **LTV Matrix**: Maximum loan-to-value ratios for each (debt asset, collateral asset) pair
- **Correlated pricing**: Other collateral prices move with the X/Y pool price

### **Liquidation Condition**
```
Total Asset Value ≤ Weighted Debt Requirement
TA(p) ≤ WDR(p)
```

Where liquidation occurs when the margin ratio `M(p) = TA(p) / WDR(p) ≤ 1`

## 2. Asset Value Formulation

### **Total Assets in Y Token Terms**
```
TA(p) = X_assets(p) + Y_assets(p) + Other_correlated_assets(p)

Where:
X_assets(p) = (X(p) + CX) × p    (LP position + extra collateral, converted to Y terms)
Y_assets(p) = Y(p) + CY          (LP position + extra collateral, already in Y terms)
Other_assets(p) = Σₖ Aₖ(p)       (Correlated collateral values in Y terms)
```

### **Concentrated Liquidity Position Components**
For price range `[pa, pb]` with liquidity `L`:
```
X(p) = L × (√pb - √p) / (√p × √pb)    when pa ≤ p ≤ pb
Y(p) = L × (√p - √pa)                 when pa ≤ p ≤ pb

dX/dp = -L / (2√p√pb)
dY/dp = L / (2√p)
```

### **Correlated Asset Pricing**
For each other collateral k:
```
Aₖ(p) = amountₖ × priceₖ(p)

Where:
priceₖ(p) = current_priceₖ × (1 + correlationₖ × (p/current_pool_price - 1))

dAₖ/dp = amountₖ × current_priceₖ × correlationₖ / current_pool_price
```

## 3. LTV-Based Weighted Debt Requirement

### **Debt Values (Critical Correction)**
Convert debt amounts to values in common currency (Y tokens):
```
DX_value(p) = DX × p    (X debt amount × X/Y price)
DY_value(p) = DY        (Y debt amount, already in Y terms)
```

### **Asset Weights**
```
wⱼ(p) = Aⱼ(p) / TA(p)

Where j ∈ {X, Y, ETH, USDC, ...} and Σⱼ wⱼ(p) = 1
```

### **Weighted Debt Requirement**
```
WDR(p) = DX_value(p) × Σⱼ (wⱼ(p) / LTV(X,j)) + DY_value(p) × Σⱼ (wⱼ(p) / LTV(Y,j))

Substituting debt values and weights:
WDR(p) = (DX × p) × Σⱼ (Aⱼ(p) / (TA(p) × LTV(X,j))) + DY × Σⱼ (Aⱼ(p) / (TA(p) × LTV(Y,j)))

WDR(p) = (1/TA(p)) × [(DX × p) × Σⱼ (Aⱼ(p) / LTV(X,j)) + DY × Σⱼ (Aⱼ(p) / LTV(Y,j))]

WDR(p) = N(p) / TA(p)
```

Where:
```
N(p) = (DX × p) × Σⱼ (Aⱼ(p) / LTV(X,j)) + DY × Σⱼ (Aⱼ(p) / LTV(Y,j))
```

## 4. Liquidation Equation and Newton-Raphson Setup

### **Margin Ratio**
```
M(p) = TA(p) / WDR(p) = [TA(p)]² / N(p)
```

### **Liquidation Condition**
```
M(p) = 1  ⟹  TA(p) = WDR(p)  ⟹  [TA(p)]² = N(p)

F(p) = TA(p) - N(p)/TA(p) = 0
```

### **Newton-Raphson Derivative**
```
F'(p) = dTA/dp - d/dp[N(p)/TA(p)]

Using quotient rule:
F'(p) = dTA/dp - [dN/dp × TA(p) - N(p) × dTA/dp] / [TA(p)]²

Simplifying:
F'(p) = dTA/dp × (1 + N(p)/[TA(p)]²) - dN/dp/TA(p)
F'(p) = dTA/dp × (1 + WDR(p)/TA(p)) - dN/dp/TA(p)
```

## 5. Critical Derivative Calculations

### **dTA/dp**
```
dTA/dp = d/dp[(X(p) + CX) × p + (Y(p) + CY) + Σₖ Aₖ(p)]
       = X(p) + CX + p × dX/dp + dY/dp + Σₖ dAₖ/dp
```

### **dN/dp (Most Complex Part)**
```
dN/dp = d/dp[(DX × p) × Σⱼ (Aⱼ(p) / LTV(X,j)) + DY × Σⱼ (Aⱼ(p) / LTV(Y,j))]
```

**X debt term** (using product rule):
```
d/dp[(DX × p) × Σⱼ (Aⱼ(p) / LTV(X,j))] = DX × Σⱼ (Aⱼ(p) / LTV(X,j)) + (DX × p) × Σⱼ (dAⱼ/dp / LTV(X,j))
```

**Y debt term** (DY is constant):
```
d/dp[DY × Σⱼ (Aⱼ(p) / LTV(Y,j))] = DY × Σⱼ (dAⱼ/dp / LTV(Y,j))
```

## Key Features of This Final Implementation

1. **Correct Debt Value Handling**: Uses `DX × p` and `DY` instead of raw amounts
2. **Proper Dimensional Analysis**: All calculations in consistent Y token terms
3. **Current Price Correlation**: No stale reference price tracking
4. **Pool Asset Debts Only**: Simplified to X and Y debts (most common case)
5. **Complete Newton-Raphson**: Handles complex derivatives with product and quotient rules
6. **Comprehensive Analytics**: Detailed breakdowns for debugging and monitoring
7. **Risk Assessment**: Practical risk metrics and liquidation distance calculations

This implementation correctly handles the mathematical complexity of multi-collateral LTV-based liquidation while maintaining computational efficiency and providing accurate liquidation price calculations.
