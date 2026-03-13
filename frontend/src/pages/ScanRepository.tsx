import React, { useState } from 'react';
import {
  GitBranchIcon,
  FileCodeIcon,
  ShieldIcon,
  SparklesIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { scanGithubRepo, scanIaC, type ScanResponse } from '../services/api';

interface Props {
  onStartScan: (url: string, type: 'code' | 'iac', promise: Promise<ScanResponse>) => void;
}

export function ScanRepository({ onStartScan }: Props) {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const validateGithubUrl = (url: string): boolean => {
    const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w.\-]+\/[\w.\-]+/;
    return githubPattern.test(url);
  };

  const startScan = (type: 'code' | 'iac') => {
    const url = repositoryUrl.trim();
    if (!url) {
      toast.error('Please enter a repository URL');
      return;
    }
    if (!validateGithubUrl(url)) {
      toast.error('Please enter a valid GitHub repository URL');
      return;
    }

    setIsScanning(true);
    const promise = type === 'code' ? scanGithubRepo(url) : scanIaC(url);
    onStartScan(url, type, promise);
  };

  return (
    <main className="min-h-screen w-full bg-cyber-black grid-background">
      <div className="ml-52 pt-16">
        <div className="p-6 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-cyber-text mb-2">
              Scan Repository
            </h1>
            <p className="text-cyber-text-secondary">
              Scan your GitHub repository for vulnerabilities
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-cyber-surface border border-cyber-border rounded-lg p-8 md:p-12 mb-8"
            >
              <div className="mb-8">
                <label
                  htmlFor="repository-url"
                  className="block text-sm font-semibold text-cyber-text mb-3"
                >
                  Repository URL
                </label>
                <input
                  id="repository-url"
                  type="text"
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && startScan('code')}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-4 py-3 bg-cyber-charcoal border border-cyber-border rounded-lg text-cyber-text placeholder-cyber-text-muted focus:outline-none focus:border-cyber-red focus:shadow-red-glow transition-all"
                  aria-label="GitHub repository URL"
                  disabled={isScanning}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <motion.button
                  whileHover={{ scale: isScanning ? 1 : 1.02 }}
                  whileTap={{ scale: isScanning ? 1 : 0.98 }}
                  onClick={() => startScan('code')}
                  disabled={isScanning || !repositoryUrl.trim()}
                  className={`flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg text-white font-semibold shadow-lg hover:shadow-xl transition-shadow ${
                    isScanning || !repositoryUrl.trim() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  aria-label="Scan source code"
                >
                  <GitBranchIcon className="w-5 h-5" aria-hidden="true" />
                  <span>Scan Code</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: isScanning ? 1 : 1.02 }}
                  whileTap={{ scale: isScanning ? 1 : 0.98 }}
                  onClick={() => startScan('iac')}
                  disabled={isScanning || !repositoryUrl.trim()}
                  className={`flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-pink-600 to-pink-500 rounded-lg text-white font-semibold shadow-lg hover:shadow-xl transition-shadow ${
                    isScanning || !repositoryUrl.trim() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  aria-label="Scan infrastructure as code"
                >
                  <FileCodeIcon className="w-5 h-5" aria-hidden="true" />
                  <span>Scan IaC</span>
                </motion.button>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="bg-cyber-charcoal border border-cyber-border-light rounded-lg p-6"
              >
                <div className="flex items-start space-x-3 mb-4">
                  <SparklesIcon className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <h3 className="text-lg font-semibold text-cyber-text">Quick Tips</h3>
                </div>
                <ul className="space-y-3 text-cyber-text-secondary">
                  <li className="flex items-start">
                    <span className="text-cyber-red mr-3 mt-1">•</span>
                    <span>Make sure the repository is public or you have access</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyber-red mr-3 mt-1">•</span>
                    <span>Code scans typically complete in 60-120 seconds</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyber-red mr-3 mt-1">•</span>
                    <span>IaC scans (Terraform/K8s) may take up to 8 minutes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyber-red mr-3 mt-1">•</span>
                    <span>Results are analyzed by Gemini 2.5 Flash for actionable insights</span>
                  </li>
                </ul>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="bg-cyber-surface border border-cyber-border rounded-lg p-6"
            >
              <h3 className="text-lg font-semibold text-cyber-text mb-4 flex items-center gap-2">
                <ShieldIcon className="w-5 h-5 text-cyber-red" />
                Example Repositories to Scan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { url: 'https://github.com/appsecco/dvna', label: 'appsecco/dvna', type: 'Code — Node.js OWASP Top 10' },
                  { url: 'https://github.com/payatu/vuln-nodejs-app', label: 'payatu/vuln-nodejs-app', type: 'Code — SQLi, secrets, path traversal' },
                  { url: 'https://github.com/bridgecrewio/terragoat', label: 'bridgecrewio/terragoat', type: 'IaC — Terraform misconfigs' },
                  { url: 'https://github.com/bridgecrewio/cfngoat', label: 'bridgecrewio/cfngoat', type: 'IaC — CloudFormation vulnerabilities' },
                ].map((repo) => (
                  <button
                    key={repo.url}
                    onClick={() => setRepositoryUrl(repo.url)}
                    className="text-left p-3 bg-cyber-charcoal border border-cyber-border hover:border-cyber-red/50 rounded-lg transition-colors"
                  >
                    <p className="text-sm font-mono text-cyber-red">{repo.label}</p>
                    <p className="text-xs text-cyber-text-muted mt-1">{repo.type}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#1f1f1f', color: '#f5f5f5', border: '1px solid #262626' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#1f1f1f' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#1f1f1f' } },
        }}
      />
    </main>
  );
}
