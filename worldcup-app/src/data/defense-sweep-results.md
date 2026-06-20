# Defense Amplification Sweep — Model B v2

Branch: model-b-v2-defense-sweep  
Tested: α ∈ {1.00, 1.25, 1.50, 1.75}  
Formula: λ_home = base_λH × hAtk × (1 + (1 − aDef) × α)  
         λ_away = base_λA × aAtk × (1 + (1 − hDef) × α)  
Dataset: 32 confirmed real WC 2026 group stage results

| α    | Accuracy | Avg Goal Err | Avg Brier | Avg Log Loss |
|------|----------|--------------|-----------|--------------|
| 1.00 | 56.3%    | 1.656        | 0.177     | 0.894        |
| 1.25 | 56.3%    | 1.656        | 0.177     | 0.892        |
| 1.50 | 56.3%    | 1.656        | 0.176     | 0.890        |
| 1.75 | 56.3%    | 1.656        | 0.176     | 0.888        |

Outcome flips vs α=1.00: 0 at any tested value  
Avg Δλ_home at α=1.75: −0.005  
Avg Δλ_away at α=1.75: +0.027  

Finding: amplification ineffective at this scale. Root cause is rating compression.
Recommendation: widen DEF rating range rather than amplify formula.
