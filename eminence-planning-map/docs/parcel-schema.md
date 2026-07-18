# Suggested parcel attribute schema

Every mapped parcel should eventually carry fields such as:

```text
parcel_id
address
acreage
current_zoning
zoning_effective_date
zoning_source
existing_land_use
future_land_use
building_count
building_square_feet
year_built
public_ownership
vacancy_status
city_limits
historic_district
water_service
sewer_service
flood_status
rezoning_case
ordinance_number
last_verified
verification_status
notes
```

## Verification values

Especially important: `zoning_source`, `last_verified`, and `verification_status`.

Recommended `verification_status` values:

| Value | Meaning |
| --- | --- |
| `verified_county_gis` | Confirmed against county GIS |
| `verified_ordinance` | Confirmed through adopted ordinance |
| `digitized_from_pdf` | Traced from an official PDF map |
| `estimated` | Approximate / model-derived |
| `awaiting_confirmation` | Not yet verified |

Public exports should omit individual owner names.
