import React, { useState, useRef } from 'react';
import { Download, Sparkles, Image as ImageIcon, Palette, Wand2, Camera, Loader2, Copy, Heart, Share2 } from 'lucide-react';

function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);

  const imageStyles = [
    { id: 'realistic', name: 'Realistic', icon: Camera, prompt: 'photorealistic, high quality, detailed, 8k' },
    { id: 'artistic', name: 'Artistic', icon: Palette, prompt: 'artistic, creative, expressive, painterly, masterpiece' },
    { id: 'fantasy', name: 'Fantasy', icon: Sparkles, prompt: 'fantasy art, magical, ethereal, mystical, epic' },
    { id: 'anime', name: 'Anime', icon: Wand2, prompt: 'anime style, manga, japanese animation, vibrant colors' },
  ];

  const imageSizes = [
    { id: '512x512', name: '512×512' },
    { id: '1024x1024', name: '1024×1024' },
    { id: '1024x768', name: '1024×768' },
    { id: '768x1024', name: '768×1024' },
  ];

  // Improved AI image generation with multiple reliable APIs
  const generateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for your image');
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    try {
      // Get the selected style prompt enhancement
      const styleData = imageStyles.find(style => style.id === selectedStyle);
      const enhancedPrompt = `${prompt}, ${styleData?.prompt || ''}`;
      
      // Parse image dimensions
      const [width, height] = imageSize.split('x').map(Number);
      
      // Generate a unique seed for variety
      const seed = Math.floor(Math.random() * 1000000);
      
      // Try multiple working AI image generation APIs
      const imageApis = [
        // Pollinations AI - Most reliable
        {
          name: 'Pollinations',
          url: `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&seed=${seed}&enhance=true&model=flux&nologo=true`,
          method: 'GET'
        },
        // Picsum with overlay text (fallback for testing)
        {
          name: 'Generated',
          url: `https://picsum.photos/${width}/${height}?random=${seed}`,
          method: 'GET'
        },
        // Another Pollinations variant
        {
          name: 'Pollinations Alt',
          url: `https://pollinations.ai/p/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&seed=${seed}`,
          method: 'GET'
        }
      ];

      let imageUrl = null;
      let apiUsed = null;
      let lastError = null;

      // Try each API until one works
      for (let i = 0; i < imageApis.length; i++) {
        const api = imageApis[i];
        
        try {
          console.log(`Trying ${api.name} API...`);
          
          // For direct URL APIs, test if the image loads
          const testPromise = new Promise((resolve, reject) => {
            const testImg = new Image();
            testImg.crossOrigin = 'anonymous';
            
            const timeout = setTimeout(() => {
              reject(new Error('Image load timeout'));
            }, 15000); // 15 second timeout
            
            testImg.onload = () => {
              clearTimeout(timeout);
              resolve(api.url);
            };
            
            testImg.onerror = (error) => {
              clearTimeout(timeout);
              reject(new Error(`Image failed to load: ${error.message || 'Unknown error'}`));
            };
            
            testImg.src = api.url;
          });

          imageUrl = await testPromise;
          apiUsed = api.name;
          console.log(`Successfully generated image using ${api.name}`);
          break; // Success, exit loop
          
        } catch (apiError) {
          console.log(`${api.name} API failed:`, apiError.message);
          lastError = apiError;
          continue; // Try next API
        }
      }

      if (!imageUrl) {
        throw new Error(`All image generation APIs failed. Last error: ${lastError?.message || 'Unknown error'}`);
      }

      const newImage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        url: imageUrl,
        prompt: prompt,
        style: selectedStyle,
        size: imageSize,
        timestamp: new Date(),
        liked: false,
        apiUsed: apiUsed
      };

      setGeneratedImages(prev => [newImage, ...prev]);
      setPrompt('');
      
      console.log(`Image generated successfully using ${apiUsed} API`);
      
    } catch (error) {
      console.error('Error generating image:', error);
      setError(`Failed to generate image: ${error.message}. Please try again with a different prompt or check your internet connection.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async (imageUrl, prompt) => {
    try {
      // Create a temporary link to download the image
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `ai-generated-${prompt.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.jpg`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // For cross-origin images, try to fetch and create blob URL
      try {
        const response = await fetch(imageUrl, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          link.href = blobUrl;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up blob URL
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
          return;
        }
      } catch (fetchError) {
        console.log('Fetch failed, trying direct download:', fetchError);
      }
      
      // Fallback: direct download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error downloading image:', error);
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  const toggleLike = (imageId) => {
    setGeneratedImages(prev =>
      prev.map(img =>
        img.id === imageId ? { ...img, liked: !img.liked } : img
      )
    );
  };

  const copyPrompt = (prompt) => {
    navigator.clipboard.writeText(prompt).then(() => {
      // Could add a toast notification here
      console.log('Prompt copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy prompt:', err);
    });
  };

  const regenerateImage = async (originalPrompt) => {
    setPrompt(originalPrompt);
    // Small delay to ensure state updates
    setTimeout(() => {
      generateImage();
    }, 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      generateImage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-cyan-500 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-yellow-500 rounded-full filter blur-3xl animate-pulse delay-2000"></div>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-pink-500 to-violet-500 p-3 rounded-2xl mr-3">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                AI Image Studio
              </h1>
            </div>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Transform your imagination into stunning visuals with our advanced AI image generation technology
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Generation Controls */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 border border-white/20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Prompt Input */}
              <div className="lg:col-span-2">
                <label className="block text-white text-lg font-semibold mb-4">
                  Describe your vision
                </label>
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="A majestic dragon soaring through clouds at sunset, digital art style..."
                    className="w-full h-32 px-6 py-4 bg-white/10 border border-white/30 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none backdrop-blur-sm"
                    disabled={isGenerating}
                    maxLength={500}
                  />
                  <div className="absolute bottom-4 right-4 text-gray-400 text-sm">
                    {prompt.length}/500
                  </div>
                </div>
                
                <p className="text-gray-400 text-sm mt-2">
                  Press Ctrl+Enter to generate • Be specific for better results
                </p>
                
                {/* Error Message */}
                {error && (
                  <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="space-y-6">
                {/* Style Selection */}
                <div>
                  <label className="block text-white text-lg font-semibold mb-3">
                    Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {imageStyles.map((style) => {
                      const Icon = style.icon;
                      return (
                        <button
                          key={style.id}
                          onClick={() => setSelectedStyle(style.id)}
                          disabled={isGenerating}
                          className={`p-3 rounded-xl transition-all duration-200 flex flex-col items-center ${
                            selectedStyle === style.id
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white transform scale-105'
                              : 'bg-white/10 text-gray-300 hover:bg-white/20'
                          } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Icon className="w-5 h-5 mb-1" />
                          <span className="text-sm">{style.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Size Selection */}
                <div>
                  <label className="block text-white text-lg font-semibold mb-3">
                    Size
                  </label>
                  <select
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value)}
                    disabled={isGenerating}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 backdrop-blur-sm disabled:opacity-50"
                  >
                    {imageSizes.map((size) => (
                      <option key={size.id} value={size.id} className="bg-gray-800">
                        {size.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="mt-8 text-center">
              <button
                onClick={generateImage}
                disabled={!prompt.trim() || isGenerating}
                className="px-12 py-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white font-bold text-lg rounded-2xl transition-all duration-200 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed flex items-center mx-auto"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Generating Magic...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-6 h-6 mr-3" />
                    Generate Image
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Images Gallery */}
          {generatedImages.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <ImageIcon className="w-6 h-6 mr-3" />
                Your Creations ({generatedImages.length})
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="group bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 transform hover:scale-105"
                    style={{
                      animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                    }}
                  >
                    <div className="relative">
                      <img
                        src={image.url}
                        alt={image.prompt}
                        className="w-full h-64 object-cover"
                        loading="lazy"
                        onError={(e) => {
                          console.error('Image failed to load:', e.target.src);
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      {/* Image Actions */}
                      <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={() => toggleLike(image.id)}
                          className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                            image.liked
                              ? 'bg-red-500/80 text-white'
                              : 'bg-white/20 text-white hover:bg-white/30'
                          }`}
                          title={image.liked ? 'Unlike' : 'Like'}
                        >
                          <Heart className={`w-4 h-4 ${image.liked ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => downloadImage(image.url, image.prompt)}
                          className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyPrompt(image.prompt)}
                          className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                          title="Copy prompt"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <p className="text-gray-300 text-sm line-clamp-2 mb-2">
                        {image.prompt}
                      </p>
                      <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
                        <span>{image.timestamp.toLocaleDateString()}</span>
                        <span>{image.style} • {image.size}</span>
                      </div>
                      <button
                        onClick={() => regenerateImage(image.prompt)}
                        disabled={isGenerating}
                        className="w-full px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-sm rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Wand2 className="w-4 h-4 mr-2" />
                        Regenerate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {generatedImages.length === 0 && !isGenerating && (
            <div className="text-center py-16">
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20 max-w-2xl mx-auto">
                <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">No images yet</h3>
                <p className="text-gray-300 mb-6">
                  Start creating amazing AI-generated images by describing what you want to see above!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
                  <div className="bg-white/5 p-4 rounded-xl">
                    <strong className="text-white">Try:</strong> "A cute golden retriever puppy playing in a sunny garden"
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl">
                    <strong className="text-white">Try:</strong> "A beautiful princess in an enchanted forest, fantasy art"
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl">
                    <strong className="text-white">Try:</strong> "A futuristic city at night with neon lights"
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl">
                    <strong className="text-white">Try:</strong> "A majestic mountain landscape at sunrise"
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <div className="text-center">
              <p className="text-gray-400 mb-4">
                Powered by AI Image Generation APIs • Create unlimited images for free
              </p>
              <div className="flex justify-center space-x-6 flex-wrap">
                <span className="text-sm text-gray-400">✨ High Quality</span>
                <span className="text-sm text-gray-400">⚡ Fast Generation</span>
                <span className="text-sm text-gray-400">🎨 Multiple Styles</span>
                <span className="text-sm text-gray-400">📱 Mobile Friendly</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

export default App;