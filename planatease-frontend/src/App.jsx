import Footer from './components/base/footer.jsx'
import './App.css';

export default function App() {
  return (
    <div>
      <img
        src="src/assets/images/planatease_logo.png"
        alt="PlanAtEase Logo"
        style={{ width: "600px", marginBottom: "20px" }}
      />
      <h1>Welcome to PlanAtEase</h1>
      <h2>Your Smart Travel Itinerary Builder</h2>
      <Footer />
    </div>
  );
}
