      req.on('error', (error) => {
        if (error.code === 'ENOTFOUND') {
          reject(new Error(`DNS resolution failed: Cannot resolve ${this.backendUrl.replace(/^https?:\/\//, '')}`));
        } else if (error.code === 'ECONNREFUSED') {
          reject(new Error(`Connection refused: Backend server may be down`));
        } else if (error.code === 'ETIMEDOUT') {
          reject(new Error(`Connection timeout: Backend server is not responding`));
        } else if (error.code === 'ECONNRESET') {
          reject(new Error(`Connection reset: Network instability detected`));
        } else {
          reject(new Error(`Network error: ${error.message}`));
        }
      });