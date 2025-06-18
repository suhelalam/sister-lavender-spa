// pages/api/test-client.js
import { Client, Environment } from 'square';

export default function handler(req, res) {
  try {
    const client = new Client({
      environment: Environment.Production,
      accessToken: 'test-EAAAl_YPjmmt3jNKouq5LhqkDH5xR8KFB7qPOaYbB1uvytifu-B4RR82QWppWLvs'
    });
    
    return res.status(200).json({
      clientInitialized: !!client,
      environmentValues: {
        Sandbox: Environment.Sandbox,
        Production: Environment.Production
      }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}