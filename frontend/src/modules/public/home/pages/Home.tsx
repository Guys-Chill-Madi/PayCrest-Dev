// Module: Home
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Slider from "../components/Slider";
import "../styles/homePayCrestCard.css";
import "../styles/homeSections.css";

const trustData = [
  { label: "App Downloads", value: 320, suffix: "+", prefix: "", compact: "320+" },
  { label: "Happy Investors", value: 180, suffix: "+", prefix: "", compact: "180+" },
  { label: "Loans Approved", value: 240, suffix: "+", prefix: "", compact: "240+" },
  { label: "Happy Customers", value: 460, suffix: "+", prefix: "", compact: "460+" },
];

const faqs = [
  {
    question: "What is the PayCrest App?",
    answer:
      "PayCrest is a digital lending platform for paperless loan journeys.",
    points: [
      "Apply for loans in minutes",
      "Complete KYC securely online",
      "Track application status in real time",
    ],
  },
  {
    question: "How can I apply for a loan?",
    answer:
      "Get started quickly with a simple, guided flow.",
    points: [
      "Register and verify your profile",
      "Select a loan and submit documents",
      "Track approvals from your dashboard",
    ],
  },
  {
    question: "Which products are available in PayCrest?",
    answer:
      "Choose from multiple loan categories tailored to your goals.",
    points: [
      "Education Loan",
      "Vehicle Loan",
      "Personal Loan",
      "Home Loan",
    ],
  },
  {
    question: "Is my data secure on PayCrest?",
    answer:
      "We follow secure practices across data collection and review.",
    points: [
      "Encrypted document storage",
      "Role-based access controls",
      "Audit-friendly verification steps",
    ],
  },
];

const testimonialsData = [
  {
    quote:
      "PayCrest made my first loan application simple. KYC and status tracking were very clear.",
    name: "Sanju John",
  },
  {
    quote:
      "I could compare products and pick the right tenure quickly. The dashboard is easy to use.",
    name: "Anoop Puri",
  },
  {
    quote:
      "Document upload and verification were smooth. Support team was responsive whenever I needed help.",
    name: "Rachit Jain",
  },
  {
    quote:
      "EMI reminders are timely and repayment status is always visible. It helped me avoid late fees.",
    name: "Meera Kulkarni",
  },
  {
    quote:
      "Loan approval steps are transparent. I always knew what was pending and what got completed.",
    name: "Arjun Malhotra",
  },
  {
    quote:
      "The mobile experience is clean and fast. I could submit my documents without any confusion.",
    name: "Nisha Verma",
  },
  {
    quote:
      "From registration to disbursal, the process felt structured and trustworthy. Great overall experience.",
    name: "Rahul Sethi",
  },
];

const Home = () => {
  const [counts, setCounts] = useState<number[]>(trustData.map(() => 0));
  const [openFaq, setOpenFaq] = useState(-1);
  const trustSectionRef = useRef<HTMLElement | null>(null);
  const countRafRef = useRef<number | null>(null);
  const isSectionVisibleRef = useRef(false);

  useEffect(() => {
    const runCountAnimation = () => {
      if (countRafRef.current !== null) {
        cancelAnimationFrame(countRafRef.current);
      }

      setCounts(trustData.map(() => 0));
      const durationMs = 1800;
      const start = performance.now();

      const tick = (now: number) => {
        const progress = Math.min((now - start) / durationMs, 1);
        setCounts(trustData.map((item) => Math.round(item.value * progress)));
        if (progress < 1) {
          countRafRef.current = requestAnimationFrame(tick);
        }
      };

      countRafRef.current = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isSectionVisibleRef.current) {
            isSectionVisibleRef.current = true;
            runCountAnimation();
          } else if (!entry.isIntersecting) {
            isSectionVisibleRef.current = false;
          }
        });
      },
      { threshold: 0.35 },
    );

    if (trustSectionRef.current) {
      observer.observe(trustSectionRef.current);
    }

    return () => {
      observer.disconnect();
      if (countRafRef.current !== null) {
        cancelAnimationFrame(countRafRef.current);
      }
    };
  }, []);

  return (
    <div className="home-page">
      <ul className="home-page-motion" aria-hidden="true">
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
      </ul>
      <section id="overview-section">
        <Slider />
      </section>


      <section id="loan-products-section" className="home-loans">
        <div className="section-head">
          <h2>Explore Loan Products</h2>
          <p>Choose the right loan and view eligibility in minutes.</p>
        </div>
        <div className="home-loans-grid">
          <article className="home-loan-card home-loan-card--img1">
            <h3>Education Loan</h3>
            <p className="home-loan-more-info">Finance your education in India or abroad</p>
            <Link to="/education">Learn More</Link>
          </article>
          <article className="home-loan-card home-loan-card--img2">
            <h3>Vehicle Loan</h3>
            <p className="home-loan-more-info">Affordable financing for your next vehicle</p>
            <Link to="/vehicle">Learn More</Link>
          </article>
          <article className="home-loan-card home-loan-card--img3">
            <h3>Personal Loan</h3>
            <p className="home-loan-more-info">Quick funds for your personal needs</p>
            <Link to="/personal">Learn More</Link>
          </article>
          <article className="home-loan-card home-loan-card--img4">
            <h3>Home Loan</h3>
            <p className="home-loan-more-info">Build or purchase your dream home</p>
            <Link to="/home-loan">Learn More</Link>
          </article>
        </div>
      </section>

      <section className="paycrest-info-card">
        <div className="paycrest-info-area">
          <div className="paycrest-context">
            <h2>About PayCrest</h2>
            <p>PayCrest is a modern, digital-first loan management platform designed to simplify and accelerate the borrowing experience.</p>
            <p>From onboarding to disbursal, every step is structured to keep your loan journey transparent, secure, and easy to track.</p>
            <div className="paycrest-detail-grid" role="list" aria-label="Banking details and service highlights">
              <article className="paycrest-detail-card" role="listitem">
                <h3>Verified Bank Details</h3>
                <p>Beneficiary account details are validated before approval and disbursal to reduce errors.</p>
              </article>
              <article className="paycrest-detail-card" role="listitem">
                <h3>Secure Disbursal Flow</h3>
                <p>Approved funds are routed only to the verified account linked to your application profile.</p>
              </article>
              <article className="paycrest-detail-card" role="listitem">
                <h3>Repayment Clarity</h3>
                <p>EMI due dates, payment history, and balance updates are shown clearly in one dashboard.</p>
              </article>
              <article className="paycrest-detail-card" role="listitem">
                <h3>Compliance Ready</h3>
                <p>KYC checks, role-based access, and audit-friendly workflows are built into the process.</p>
              </article>
            </div>
          </div>
          <ul className="paycrest-circles" aria-hidden="true">
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
          </ul>
        </div>
      </section>

      <section id="how-it-works-section" className="why-paycrest">
        <div className="section-head">
          <h2>Why Choose PayCrest?</h2>
          <p>Experience financial services built with your needs in mind</p>
        </div>
        <div className="why-paycrest-grid">
          <article className="why-tile">Completely Paperless & Digital</article>
          <article className="why-tile">Fast KYC & Verification Process</article>
          <article className="why-tile">Secure & Regulated Platform</article>
          <article className="why-tile">24/7 Customer Support</article>
        </div>
      </section>

      <section className="trust-section" ref={trustSectionRef}>
        <div className="section-head">
          <h2>Trusted by Millions of Users</h2>
          <p>Clear metrics that show platform reliability and growth.</p>
        </div>
        <div className="trust-grid">
          {trustData.map((item, idx) => (
            <div key={item.label} className="trust-item">
              <div className="trust-value">{item.prefix}{counts[idx].toLocaleString()}{item.suffix}</div>
              <div className="trust-label">{item.label}</div>
              <div className="trust-compact">{item.compact}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="testimonials">
        <div className="section-head">
          <h2>What our customers say about us</h2>
          <p>Real feedback from borrowers using PayCrest every day.</p>
        </div>
        <div
          className="testimonial-carousel"
          aria-label="Customer testimonials carousel"
        >
          {testimonialsData.map((item, idx) => (
            <article
              key={`${item.name}-${idx}`}
              className="testimonial-carousel-card"
            >
              <div className="testimonial-avatar">
                {item.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <p>{item.quote}</p>
              <h3>{item.name}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="faq-section">
        <div className="section-head">
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know before applying.</p>
        </div>
        <div className="faq-list">
          {faqs.map((item, idx) => (
            <article key={item.question} className={`faq-item ${openFaq === idx ? "open" : ""}`}>
              <button
                type="button"
                className="faq-trigger"
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                aria-expanded={openFaq === idx}
              >
                <span>{item.question}</span>
                <span className="faq-icon">{openFaq === idx ? "-" : "+"}</span>
              </button>
              {openFaq === idx && (
                <div className="faq-answer">
                  <p>{item.answer}</p>
                  {item.points && (
                    <ul className="faq-points">
                      {item.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;


