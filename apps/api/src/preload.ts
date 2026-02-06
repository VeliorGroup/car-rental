// This file is loaded first to suppress verbose library logging
// It intercepts console.log to filter out @prisma/adapter-pg Client dumps

const originalConsoleLog = console.log;
console.log = (...args: any[]) => {
  // Suppress verbose pg Client object dumps from @prisma/adapter-pg
  if (args.length > 0) {
    const firstArg = args[0];
    
    // Check if it's an object that looks like a pg Client
    if (typeof firstArg === 'object' && firstArg !== null) {
      if ('_types' in firstArg || 
          ('database' in firstArg && 'host' in firstArg && '_ending' in firstArg) ||
          ('_connected' in firstArg && '_queryable' in firstArg)) {
        return; // Suppress this log
      }
    }
    
    // Check string representation for Client object patterns
    const str = String(args[0]);
    if (str.includes('_queryable') || 
        str.includes('_poolUseCount') ||
        str.includes('builtins:') ||
        str.startsWith('Client {')) {
      return; // Suppress this log
    }
  }
  originalConsoleLog.apply(console, args);
};

export {};
