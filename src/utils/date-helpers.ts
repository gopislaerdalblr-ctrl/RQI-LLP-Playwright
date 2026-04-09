export function getTargetDateFromQuarter(qtrString: string) {
    // Extracts the number from "qtr -1", "qtr 0", "qtr 2", etc.
    const match = qtrString.match(/-?\d+/);
    const offset = match ? parseInt(match[0], 10) : 0;

    const targetDate = new Date();

    if (offset !== 0) {
        // 1 quarter = 3 months
        targetDate.setMonth(targetDate.getMonth() + (offset * 3));
    }

    return {
        yyyy: targetDate.getFullYear().toString(),
        mm: String(targetDate.getMonth() + 1).padStart(2, '0'),
        dd: String(targetDate.getDate()).padStart(2, '0')
    };
}