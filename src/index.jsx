import React from 'react';
import ReactDOM from 'react-dom/client';
import BattleSimulator from './app'; // Note the lowercase import

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BattleSimulator />
  </React.StrictMode>
);