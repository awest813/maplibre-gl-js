# Data request templates — Eminence Planning Map

**Still useful for verification.** The live map already loads free public `HenryCoZoning` / `HenryCoParcels` ArcGIS layers. Use these templates to confirm whether the `Landuse_Henry` layer is authoritative current zoning, request amendment history, and obtain metadata (effective date, projection, responsible agency).

Preferred formats: GeoPackage, shapefile, GeoJSON, file geodatabase, or a spreadsheet with parcel IDs and zoning classifications.

## Henry County Planning and Zoning

**Contact:** Jason Stanley, Planning and Zoning administrator  
**Address:** 19 South Property Road  
**Phone:** 502-845-5707, extension 2  
**Page:** https://henrycounty.ky.gov/Departments/Pages/Planning-Zoning.aspx

### Geographic data request

> Please provide the most current machine-readable geographic data covering the City of Eminence for:
>
> 1. Current zoning-district boundaries or parcel-level zoning assignments.
> 2. All zoning-map amendments or rezonings adopted since the dataset was last updated.
> 3. The most recently adopted future-land-use map.
> 4. The current City of Eminence corporate boundary.
> 5. Any available parcel-identification field used to connect zoning data to PVA parcels.
> 6. Metadata showing the dataset’s effective date, projection and responsible agency.
>
> Preferred formats are GeoPackage, shapefile, GeoJSON, file geodatabase or a spreadsheet containing parcel IDs and zoning classifications. PDF maps may also be provided if no machine-readable geographic data exists.

### Legal / ordinance audit trail

Also request a table or copies of:

- Every zoning-map amendment affecting Eminence
- Ordinance or case number
- Adoption date
- Parcel identification number
- Previous zoning
- New zoning
- Conditions imposed on the rezoning
- Link or citation to meeting minutes

### Application / case files (optional follow-up)

- Pending rezoning applications
- Conditional-use permits
- Variances
- Approved subdivisions
- Development plans
- Planning commission case files
- Current zoning and subdivision regulations
- GIS files used internally during application review

## Henry County PVA (parcels)

Kentucky Department of Revenue advises approaching the local PVA first for county property-map information. Request parcels:

- Inside Eminence
- Partially intersecting the city boundary
- Within about one mile of the city boundary (annexation / growth analysis)

Ask for:

- Parcel polygons
- Parcel identification number
- Property address
- Acreage
- Land-use or property-class code
- Assessed land and improvement values
- Building year and square footage, where available

**Do not require owner names for the public map.** Ownership can stay in a separate internal extract.

State fallback (fee-based): https://revenue.ky.gov/Property/Mapping-Services/Pages/default.aspx

## City of Eminence

Ask the city clerk for:

- City-owned parcels and buildings
- Vacant, abandoned, or condemned-property lists
- Demolition permits
- Residential and commercial building permits
- Annexation ordinances and maps
- Subdivision approvals
- Current and planned sidewalk projects
- Water and sewer service boundaries
- Wastewater capacity documents
- Development incentive agreements

Council / meetings: https://eminence.ky.gov/our-city/Pages/City-Council-Meetings.aspx

## Utilities

Request **generalized** service areas and capacity information only (not valve / line / critical-facility detail):

- Water-service availability
- Sewer-service availability
- Approximate distance to existing service
- Known capacity limitations
- Planned expansion areas
- Areas dependent on septic systems

## Important distinction for the map

Keep these as **separate toggleable layers**:

1. Current zoning  
2. Existing land use  
3. Adopted future land use  
4. Proposed future changes  

Do not label a traced PDF as “official current zoning” without Planning and Zoning verification.
