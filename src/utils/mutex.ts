import * as fs from 'fs';
import * as path from 'path';

const lockDir = path.resolve(process.cwd(), '.locks');

export async function acquireLock(lockName: string, maxWaitMs = 60000) {
    if (!fs.existsSync(lockDir)) {
        fs.mkdirSync(lockDir, { recursive: true });
    }
    const lockFile = path.join(lockDir, `${lockName}.lock`);
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
        try {
            
            fs.writeFileSync(lockFile, 'locked', { flag: 'wx' });
            console.log(`\n[MUTEX] Lock '${lockName}' acquired. Proceeding into critical section...`);
            return true;
        } catch (err) {
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    throw new Error(`[FATAL] Timeout waiting for lock: ${lockName}. Another worker took too long.`);
}

export function releaseLock(lockName: string) {
    const lockFile = path.join(lockDir, `${lockName}.lock`);
    if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
        console.log(`\n[MUTEX] Lock '${lockName}' released. Next worker may proceed.`);
    }
}