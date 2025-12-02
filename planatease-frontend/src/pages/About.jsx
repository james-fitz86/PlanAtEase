import PageContainer from "../components/base/PageContainer";

export default function About() {
  return (
    <PageContainer>
      <div className="about-page" style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1>About Us</h1>

        {/* Mission section */}
        <section>
          <h2>
            <i className="fa-solid fa-bullseye" style={{ marginRight: "8px" }}></i>
            Our Mission
          </h2>
          <p>
            Our mission is to remove the chaos from travel planning. Whether you’re organizing
            a family holiday, a work trip, or an adventure with friends, we provide the tools
            you need to keep everyone connected and informed.
          </p>
        </section>

        {/* Origin Story */}
        <section>
          <h2>
            <i className="fa-solid fa-book-open" style={{ marginRight: "8px" }}></i>
            Our Story
          </h2>
          <p>
            Like many travelers, we used to juggle spreadsheets, endless message threads, and
            scattered notes when planning trips. We saw how frustrating this was — so we built
            <strong> PlanAtEase </strong> to bring clarity and convenience to the process.
          </p>
        </section>

        {/* Unique Selling Point */}
        <section>
          <h2>
            <i className="fa-solid fa-handshake" style={{ marginRight: "8px" }}></i>
            What We Offer
          </h2>
          <ul>
            <li>Trip Planning Tools – Create and manage itineraries with dates, locations, and activities.</li>
            <li>Collaboration – Invite others to contribute, share ideas, and stay updated in real time.</li>
            <li>Smart Features – From maps to reminders, everything is designed to keep planning smooth.</li>
          </ul>
        </section>

        {/* Values */}
        <section>
          <h2>
            <i className="fa-solid fa-check-circle" style={{ marginRight: "8px" }}></i>
            Why Choose Us
          </h2>
          <p>
            We value <strong>simplicity, collaboration, and trust</strong>. Our platform is secure,
            easy to use, and always evolving with feedback from travelers like you.
          </p>
        </section>

        {/* Future growth */}
        <section>
          <h2>
            <i className="fa-solid fa-rocket" style={{ marginRight: "8px" }}></i>
            Looking Ahead
          </h2>
          <p>
            We’re constantly working on new features to make travel even easier — from smarter
            suggestions to seamless integrations. This is just the beginning.
          </p>
        </section>
      </div>
    </PageContainer>
  );
}
