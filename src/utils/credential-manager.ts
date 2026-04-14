import * as fs from 'fs';
import * as path from 'path';

export function getAdminForCurrentWorker() {
  let targetInstance = '';
  
  try {
    const instanceConfigPath = path.resolve(process.cwd(), 'instance.json');
    if (fs.existsSync(instanceConfigPath)) {
      const instanceData = JSON.parse(fs.readFileSync(instanceConfigPath, 'utf8'));
      targetInstance = (instanceData.instance || instanceData.activeInstance || process.env.INSTANCE || 'maurya').toLowerCase();
    } else {
      targetInstance = (process.env.INSTANCE || 'maurya').toLowerCase();
    }
  } catch (err) {
    targetInstance = (process.env.INSTANCE || 'maurya').toLowerCase();
  }

  const configPath = path.resolve(__dirname, '../config/config.json');
  if (!fs.existsSync(configPath)) {
      throw new Error(`[FATAL] Config file not found at: ${configPath}`);
  }
  
  const configContent = fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '').trim();
  const config = JSON.parse(configContent);
  
  if (!config.instances || !config.instances[targetInstance]) {
      throw new Error(`[FATAL] No configuration found for instance: "${targetInstance}" inside config.json.`);
  }

  const adminPool = config.instances[targetInstance].adminPool;
  
  if (!Array.isArray(adminPool) || adminPool.length === 0) {
      throw new Error(`[FATAL] adminPool is not defined or is empty for instance: "${targetInstance}" in config.json`);
  }
  
  const workerIdStr = process.env.CUCUMBER_WORKER_ID || process.env.TEST_WORKER_INDEX || '0';
  const workerId = parseInt(workerIdStr, 10);
  
  const poolIndex = isNaN(workerId) ? 0 : workerId % adminPool.length;
  
  const identifier = adminPool[poolIndex].email || adminPool[poolIndex].username;
  console.log(`\n[DEBUG] Auto-detected Instance: ${targetInstance} | Parallel Worker ID: ${workerIdStr} assigned to Admin Pool Index: ${poolIndex} using ${identifier}`);
  
  return adminPool[poolIndex];
}