import React, { useState, useEffect } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Link2, Shield, Lock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface UrlData {
  shortCode: string;
  originalUrl: string;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [url, setUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [urls, setUrls] = useState<UrlData[]>([]);

  useEffect(() => {
    if (userId) {
      fetchUrls();
    }
  }, [userId]);

  const fetchUrls = async () => {
    try {
      const response = await fetch(`/api/urls?userId=${userId}`);
      const data = await response.json();
      if (response.ok) {
        setUrls(data.urls);
      }
    } catch (error) {
      console.error('Error fetching URLs:', error);
      toast.error('Failed to fetch your URLs');
    }
  };

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      const decoded = JSON.parse(atob(credentialResponse.credential!.split('.')[1]));
      setUserEmail(decoded.email);
      setUserId(decoded.sub); // Use the Google user ID as our userId
      setIsAuthenticated(true);
      toast.success('Successfully logged in!');
    } catch (error) {
      console.error('Error decoding token:', error);
      toast.error('Login failed');
    }
  };

  const handleError = () => {
    console.error('Google Sign-In failed');
    toast.error('Login Failed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      const urlObject = new URL(url);
      if (!['http:', 'https:'].includes(urlObject.protocol)) {
        throw new Error('Invalid protocol');
      }

      const response = await fetch('/api/urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, userId }),
      });

      const data = await response.json();
      
      if (response.ok) {
        const newShortUrl = `${window.location.origin}/${data.shortCode}`;
        setShortUrl(newShortUrl);
        toast.success('URL shortened successfully!');
        fetchUrls(); // Refresh the URLs list
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error shortening URL:', error);
      toast.error('Failed to shorten URL');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <Link2 className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Secure URL Shortener</h1>
            <p className="text-gray-400">Shorten your URLs with privacy and security in mind</p>
          </div>

          {!isAuthenticated ? (
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl">
              <div className="text-center mb-6">
                <Lock className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                <h2 className="text-2xl font-semibold mb-2">Sign in to continue</h2>
                <p className="text-gray-400">Use your Google account to access the service</p>
              </div>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleSuccess}
                  onError={handleError}
                  width="300"
                  useOneTap={false}
                  auto_select={false}
                />
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl">
              <div className="mb-6 text-center">
                <p className="text-sm text-gray-400">Logged in as: {userEmail}</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="url" className="block text-sm font-medium mb-2">
                    Enter your URL
                  </label>
                  <input
                    type="text"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition duration-200"
                >
                  Shorten URL
                </button>
              </form>

              {shortUrl && (
                <div className="mt-6 p-4 bg-gray-700 rounded">
                  <p className="text-sm font-medium mb-2">Your shortened URL:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shortUrl}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-600 rounded"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shortUrl);
                        toast.success('Copied to clipboard!');
                      }}
                      className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition duration-200"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {urls.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">Your URLs</h3>
                  <div className="space-y-4">
                    {urls.map((urlData) => (
                      <div key={urlData.shortCode} className="p-4 bg-gray-700 rounded">
                        <p className="text-sm text-gray-300 mb-2">{urlData.originalUrl}</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={`${window.location.origin}/${urlData.shortCode}`}
                            readOnly
                            className="w-full px-3 py-2 bg-gray-600 rounded"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/${urlData.shortCode}`);
                              toast.success('Copied to clipboard!');
                            }}
                            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition duration-200"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto mb-3 text-blue-500" />
              <h3 className="font-semibold mb-2">Secure</h3>
              <p className="text-gray-400 text-sm">All URLs are checked for security threats</p>
            </div>
            <div className="text-center">
              <Lock className="w-8 h-8 mx-auto mb-3 text-blue-500" />
              <h3 className="font-semibold mb-2">Private</h3>
              <p className="text-gray-400 text-sm">Your data is protected and never shared</p>
            </div>
            <div className="text-center">
              <Link2 className="w-8 h-8 mx-auto mb-3 text-blue-500" />
              <h3 className="font-semibold mb-2">Fast</h3>
              <p className="text-gray-400 text-sm">Lightning-fast URL shortening</p>
            </div>
          </div>
        </div>
      </div>
      <Toaster position="bottom-center" />
    </div>
  );
}

export default App;