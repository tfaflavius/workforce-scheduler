import { BrowserRouter } from 'react-router-dom';

function TestApp() {
  return (
    <BrowserRouter>
      <div style={{ padding: '20px' }}>
        <h1>Test Page - If you see this, React works!</h1>
        <p>Backend is at: http://localhost:3000</p>
        <p>Frontend is at: http://localhost:5173</p>
      </div>
    </BrowserRouter>
  );
}

export default TestApp;
