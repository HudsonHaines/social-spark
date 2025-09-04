// src/components/MobileFrame.jsx
import React from 'react';

const cx = (...a) => a.filter(Boolean).join(" ");

export default function MobileFrame({ 
  children, 
  className = "",
  showStatusBar = true,
  deviceType = "iphone" // iphone, android
}) {
  return (
    <div className={cx("relative mx-auto", className)} style={{ width: '375px', paddingBottom: '40px' }}>
      {/* Realistic iPhone 14 Pro frame */}
      <div 
        className="relative bg-gray-900 shadow-2xl" 
        style={{ 
          borderRadius: '60px',
          padding: '8px',
          background: 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #1f2937 100%)',
          boxShadow: `
            0 32px 64px -12px rgba(0, 0, 0, 0.25),
            0 20px 40px -12px rgba(0, 0, 0, 0.15),
            0 8px 16px -8px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 1px rgba(255, 255, 255, 0.1),
            inset 0 -1px 1px rgba(0, 0, 0, 0.2)
          `
        }}
      >
        {/* Dynamic Island */}
        <div 
          className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30"
          style={{
            width: '126px',
            height: '37px',
            backgroundColor: '#000',
            borderRadius: '19px'
          }}
        />
        
        {/* Screen container with realistic dimensions */}
        <div 
          className="bg-white overflow-hidden relative"
          style={{ 
            borderRadius: '50px',
            height: '812px', // iPhone 14 Pro height
            width: '359px'   // Calculated width minus padding
          }}
        >
          {/* Realistic iOS Status Bar */}
          {showStatusBar && (
            <div 
              className="bg-white flex items-center justify-between text-black relative z-20"
              style={{ 
                height: '54px',
                paddingTop: '16px',
                paddingLeft: '33px',
                paddingRight: '33px',
                paddingBottom: '8px',
                fontSize: '17px',
                fontWeight: '600',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'
              }}
            >
              <div className="flex items-center">
                <span>9:41</span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Cellular bars */}
                <div className="flex items-end gap-0.5">
                  <div className="w-1 h-1 bg-black rounded-full"></div>
                  <div className="w-1 h-1.5 bg-black rounded-full"></div>
                  <div className="w-1 h-2 bg-black rounded-full"></div>
                  <div className="w-1 h-2.5 bg-black rounded-full"></div>
                </div>
                {/* WiFi icon */}
                <svg width="17" height="15" viewBox="0 0 17 15" fill="none">
                  <path d="M8.5 0C13.1944 0 16.8611 2.44444 16.8611 5.45833C16.8611 6.18056 16.5556 6.84722 16.0278 7.375L8.5 15L0.972222 7.375C0.444444 6.84722 0.138889 6.18056 0.138889 5.45833C0.138889 2.44444 3.80556 0 8.5 0Z" fill="black"/>
                </svg>
                {/* Battery */}
                <div className="flex items-center">
                  <div 
                    className="border border-black flex items-center"
                    style={{ 
                      width: '27px', 
                      height: '13px', 
                      borderRadius: '3px',
                      borderWidth: '1px'
                    }}
                  >
                    <div 
                      className="bg-black h-full"
                      style={{ 
                        width: '70%',
                        borderRadius: '2px',
                        margin: '1px'
                      }}
                    ></div>
                  </div>
                  <div 
                    className="bg-black ml-0.5"
                    style={{ 
                      width: '2px', 
                      height: '6px', 
                      borderRadius: '0 2px 2px 0'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          
          {/* App content area - realistic mobile app background */}
          <div 
            className="bg-white relative"
            style={{ 
              height: showStatusBar ? 'calc(100% - 54px)' : '100%',
              minHeight: '758px' // Remaining height after status bar
            }}
          >
            {children}
          </div>
          
          {/* Home indicator - realistic iOS style */}
          <div 
            className="absolute bottom-2 left-1/2 transform -translate-x-1/2"
            style={{ bottom: '8px' }}
          >
            <div 
              className="bg-black rounded-full"
              style={{ 
                width: '134px', 
                height: '5px',
                opacity: '0.3'
              }}
            ></div>
          </div>
        </div>
        
        {/* Side buttons */}
        <div 
          className="absolute left-0 bg-gray-800"
          style={{ 
            top: '106px',
            width: '3px',
            height: '32px',
            borderRadius: '0 3px 3px 0'
          }}
        ></div>
        <div 
          className="absolute left-0 bg-gray-800"
          style={{ 
            top: '158px',
            width: '3px',
            height: '62px',
            borderRadius: '0 3px 3px 0'
          }}
        ></div>
        <div 
          className="absolute left-0 bg-gray-800"
          style={{ 
            top: '238px',
            width: '3px',
            height: '62px',
            borderRadius: '0 3px 3px 0'
          }}
        ></div>
        
        {/* Power button */}
        <div 
          className="absolute right-0 bg-gray-800"
          style={{ 
            top: '195px',
            width: '3px',
            height: '78px',
            borderRadius: '3px 0 0 3px'
          }}
        ></div>
      </div>
    </div>
  );
}

// Compact mobile frame for smaller previews but still realistic
export function MiniMobileFrame({ children, className = "" }) {
  return (
    <div className={cx("relative mx-auto", className)} style={{ width: '200px', paddingBottom: '20px' }}>
      <div 
        className="relative bg-gray-900 shadow-xl" 
        style={{ 
          borderRadius: '32px',
          padding: '4px',
          background: 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #1f2937 100%)',
          boxShadow: `
            0 20px 40px -8px rgba(0, 0, 0, 0.2),
            0 12px 24px -6px rgba(0, 0, 0, 0.15),
            0 4px 8px -4px rgba(0, 0, 0, 0.1)
          `
        }}
      >
        {/* Mini Dynamic Island */}
        <div 
          className="absolute top-1 left-1/2 transform -translate-x-1/2 z-30"
          style={{
            width: '67px',
            height: '20px',
            backgroundColor: '#000',
            borderRadius: '10px'
          }}
        />
        
        <div 
          className="bg-white overflow-hidden relative"
          style={{ 
            borderRadius: '28px',
            height: '433px', // Proportional to iPhone 14 Pro
            width: '192px'
          }}
        >
          {/* Mini status bar */}
          <div 
            className="bg-white flex items-center justify-between text-black"
            style={{ 
              height: '29px',
              paddingTop: '8px',
              paddingLeft: '18px',
              paddingRight: '18px',
              paddingBottom: '4px',
              fontSize: '9px',
              fontWeight: '600'
            }}
          >
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex items-end gap-px">
                <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                <div className="w-0.5 h-1 bg-black rounded-full"></div>
                <div className="w-0.5 h-1.5 bg-black rounded-full"></div>
                <div className="w-0.5 h-2 bg-black rounded-full"></div>
              </div>
              <div 
                className="border border-black flex items-center ml-1"
                style={{ 
                  width: '14px', 
                  height: '7px', 
                  borderRadius: '2px'
                }}
              >
                <div 
                  className="bg-black h-full"
                  style={{ 
                    width: '70%',
                    borderRadius: '1px',
                    margin: '0.5px'
                  }}
                ></div>
              </div>
              <div 
                className="bg-black ml-px"
                style={{ 
                  width: '1px', 
                  height: '3px', 
                  borderRadius: '0 1px 1px 0'
                }}
              ></div>
            </div>
          </div>
          
          <div 
            className="bg-white"
            style={{ 
              height: 'calc(100% - 29px)',
              minHeight: '404px'
            }}
          >
            {children}
          </div>
          
          {/* Mini home indicator */}
          <div 
            className="absolute bottom-1 left-1/2 transform -translate-x-1/2"
            style={{ bottom: '4px' }}
          >
            <div 
              className="bg-black rounded-full"
              style={{ 
                width: '71px', 
                height: '3px',
                opacity: '0.3'
              }}
            ></div>
          </div>
        </div>
        
        {/* Mini side buttons */}
        <div 
          className="absolute left-0 bg-gray-800"
          style={{ 
            top: '56px',
            width: '2px',
            height: '17px',
            borderRadius: '0 2px 2px 0'
          }}
        ></div>
        <div 
          className="absolute left-0 bg-gray-800"
          style={{ 
            top: '84px',
            width: '2px',
            height: '33px',
            borderRadius: '0 2px 2px 0'
          }}
        ></div>
        <div 
          className="absolute left-0 bg-gray-800"
          style={{ 
            top: '127px',
            width: '2px',
            height: '33px',
            borderRadius: '0 2px 2px 0'
          }}
        ></div>
        
        {/* Mini power button */}
        <div 
          className="absolute right-0 bg-gray-800"
          style={{ 
            top: '104px',
            width: '2px',
            height: '41px',
            borderRadius: '2px 0 0 2px'
          }}
        ></div>
      </div>
    </div>
  );
}