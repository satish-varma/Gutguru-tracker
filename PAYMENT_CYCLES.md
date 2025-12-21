# HungerBox Payment Cycles

This document outlines the expected payment schedules based on the service dates.

## Payment Logic

The payment cycle occurs twice a week:

### Cycle 1 (Early Week)
*   **Service Days**: Monday, Tuesday, Wednesday
*   **Expected Payment**: Friday (of the same week)
*   **Delayed Payment**: Saturday

### Cycle 2 (Late Week)
*   **Service Days**: Thursday, Friday (and potentially weekends)
*   **Expected Payment**: Tuesday (of the *next* week)
*   **Delayed Payment**: Wednesday (of the *next* week)

## Invoice Identification
To correlate invoices with these cycles, check the **"For the Date Range"** field in the Payment Advice PDF.

*   **Example 1**: Date Range `2025-12-15` (Mon) to `2025-12-17` (Wed) matches **Cycle 1**.
    *   *Expected Invoice Date*: ~2025-12-19 (Fri).

*   **Example 2**: Date Range `2025-12-18` (Thu) to `2025-12-19` (Fri) matches **Cycle 2**.
    *   *Expected Invoice Date*: ~2025-12-23 (Tue).
