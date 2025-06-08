
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';

interface TokenInputProps {
  mapboxToken: string;
  setMapboxToken: (token: string) => void;
  onLoadMap: () => void;
}

export const TokenInput: React.FC<TokenInputProps> = ({
  mapboxToken,
  setMapboxToken,
  onLoadMap,
}) => {
  return (
    <div className="absolute inset-0 w-full h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 z-10">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Map</h2>
          <p className="text-gray-600">Enter your Mapbox public token to get started</p>
        </div>
        
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="pk.eyJ1IjoieW91cnVzZXJuYW1lIi..."
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
            className="w-full"
          />
          
          <Button 
            onClick={() => {
              console.log('Load Map button clicked');
              onLoadMap();
            }}
            disabled={!mapboxToken}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Load Map
          </Button>
          
          <div className="text-sm text-gray-500 text-center">
            <p>Get your free token at{' '}
              <a 
                href="https://mapbox.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
