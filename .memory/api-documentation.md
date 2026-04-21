# Internal API Notes

## External Sources

- SpaceX API v4
- Launch Library 2
- NASA APOD

## Internal Route

- `GET /api/launches?type=all`
- `GET /api/launches?type=live`
- `GET /api/launches?type=next`

## Current Behavior

- `all` returns normalized upcoming launches
- `live` returns only launches in the live window
- `next` returns a single launch or `null`

## Current Cache Timing

- `all`: 30 minutes
- `live`: 2 minutes
- `next`: 5 minutes
