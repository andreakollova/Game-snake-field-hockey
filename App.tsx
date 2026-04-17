
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Game from './pages/Game';

const App: React.FC = () => {
  useEffect(() => {
    // Funkcia na odstránenie loaderu z index.html
    const removePreloader = () => {
      const preloader = document.getElementById('app-preloader');
      if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => {
          preloader.remove();
        }, 500);
      }
    };

    // V prostredí iOS/Capacitor chceme skryť loader až keď je React ready
    if (document.readyState === 'complete') {
      removePreloader();
    } else {
      window.addEventListener('load', removePreloader);
      // Fallback ak by sa load event nespustil
      setTimeout(removePreloader, 2000);
    }

    return () => window.removeEventListener('load', removePreloader);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="*" element={<Game />} />
      </Routes>
    </Router>
  );
};

export default App;
