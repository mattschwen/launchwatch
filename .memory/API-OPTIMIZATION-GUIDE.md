# API Optimization Guide

## Existing Optimizations

- server-side cache in `/api/launches`
- longer raw cache for Launch Library 2
- direct `next: { revalidate }` hints on fetches
- client polling intervals matched to view needs

## Operational Goal

Stay within free-tier API limits while keeping the live and next-launch views reasonably fresh.

## Current Tuning

- do not increase Launch Library 2 refresh frequency without a reason
- keep live and next-launch cache windows shorter than the general upcoming list
- keep docs in sync with any cache changes
