import React from "react";
import {
  Menu,
  Mic,
  GraduationCap,
  TrendingUp,
  Award,
  Play,
  Trophy,
  ArrowRight,
  Check,
  Users,
  Video,
  Calendar,
  BarChart3,
  Gift,
} from "lucide-react";
import "./ChallengeLanding.css";

export default function ChallengeLanding() {
  return (
    <div className="articulate-page">
      <header className="a60-header">
        <div>
          <div className="a60-logo">
            ARTICULATE <span>60</span>
          </div>
          <div className="a60-tagline">Learn. Practice. Improve.</div>
        </div>
        <nav className="a60-nav-links">
          <a href="#experience">How it works</a>
          <a href="#included">What's included</a>
          <a href="#challenge">Challenge</a>
        </nav>
        <button className="a60-menu-btn" aria-label="Open menu">
          <Menu size={24} />
        </button>
      </header>

      <section className="a60-hero">
        <div className="a60-hero-inner">
          <span className="a60-eyebrow">Become a confident communicator</span>
          <h1>Stop learning. Start practicing.</h1>
          <p>
            Articulate 60 helps you build real speaking skills through daily
            practice, expert teaching, and a community that keeps you
            accountable.
          </p>

          <div className="a60-features">
            <div className="a60-feature">
              <div className="a60-feature-icon">
                <Mic size={20} />
              </div>
              <span>Daily Speaking Practice</span>
            </div>
            <div className="a60-feature">
              <div className="a60-feature-icon">
                <GraduationCap size={20} />
              </div>
              <span>Masterclasses with Azimah</span>
            </div>
            <div className="a60-feature">
              <div className="a60-feature-icon">
                <TrendingUp size={20} />
              </div>
              <span>Track Your Progress</span>
            </div>
            <div className="a60-feature">
              <div className="a60-feature-icon">
                <Award size={20} />
              </div>
              <span>Certificates & Rewards</span>
            </div>
          </div>

          <button className="a60-cta-primary">
            JOIN THE CHALLENGE <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <section className="a60-process" id="experience">
        <div className="a60-container">
          <h2>A COMPLETE LEARNING EXPERIENCE</h2>
          <div className="a60-process-steps">
            <div className="a60-step">
              <div className="a60-step-icon">
                <Play size={20} />
              </div>
              <strong>Learn</strong>
              <p>Join the masterclass</p>
            </div>
            <ArrowRight size={16} className="a60-step-arrow" />
            <div className="a60-step">
              <div className="a60-step-icon">
                <Mic size={20} />
              </div>
              <strong>Practice</strong>
              <p>14 days of daily speaking</p>
            </div>
            <ArrowRight size={16} className="a60-step-arrow" />
            <div className="a60-step">
              <div className="a60-step-icon">
                <TrendingUp size={20} />
              </div>
              <strong>Track</strong>
              <p>See your progress & streak</p>
            </div>
            <ArrowRight size={16} className="a60-step-arrow" />
            <div className="a60-step">
              <div className="a60-step-icon">
                <Trophy size={20} />
              </div>
              <strong>Complete</strong>
              <p>Unlock rewards & recognition</p>
            </div>
          </div>
        </div>
      </section>

      <section className="a60-included" id="included">
        <div className="a60-container">
          <h2>WHAT YOU GET IN EVERY CHALLENGE</h2>
          <div className="a60-included-list">
            <div className="a60-included-item">
              <div className="a60-included-check">
                <Check size={13} />
              </div>
              <span>1-hour live masterclass with Azimah</span>
              <Users size={16} />
            </div>
            <div className="a60-included-item">
              <div className="a60-included-check">
                <Check size={13} />
              </div>
              <span>Masterclass recording</span>
              <Video size={16} />
            </div>
            <div className="a60-included-item">
              <div className="a60-included-check">
                <Check size={13} />
              </div>
              <span>14 days of structured speaking practice</span>
              <Calendar size={16} />
            </div>
            <div className="a60-included-item">
              <div className="a60-included-check">
                <Check size={13} />
              </div>
              <span>Daily speaking topics & prompts</span>
              <Mic size={16} />
            </div>
            <div className="a60-included-item">
              <div className="a60-included-check">
                <Check size={13} />
              </div>
              <span>Progress tracking & streaks</span>
              <BarChart3 size={16} />
            </div>
            <div className="a60-included-item">
              <div className="a60-included-check">
                <Check size={13} />
              </div>
              <span>Completion certificate</span>
              <Award size={16} />
            </div>
            <div className="a60-included-item">
              <div className="a60-included-check">
                <Check size={13} />
              </div>
              <span>1-hour live completion session (for completers)</span>
              <Trophy size={16} />
            </div>
          </div>

          <div className="a60-reward">
            <div className="a60-reward-icon">
              <Gift size={20} />
            </div>
            <div>
              <h3>COMPLETE THE CHALLENGE, UNLOCK THE REWARD</h3>
              <p>
                Finish all 14 days and get access to the Articulate Completion
                Session with Azimah.
              </p>
            </div>
          </div>

          <div className="a60-challenge" id="challenge">
            <div>
              <div className="a60-challenge-label">CHALLENGE 01</div>
              <h3>14-Day Impromptu Speaking Challenge</h3>
              <div className="a60-challenge-meta">
                <span>
                  <Calendar size={12} /> 14 Days
                </span>
                <span>
                  <Users size={12} /> Live Masterclass + Completion Session
                </span>
              </div>
            </div>
            <div className="a60-price-box">
              <div className="founding">FOUNDING PRICE</div>
              <div className="price">&#8358;3,900</div>
              <div className="offer">Limited Time Offer</div>
            </div>
          </div>
        </div>
      </section>

      <div className="a60-bottom-bar">
        JOIN THE CHALLENGE NOW <ArrowRight size={18} />
      </div>
    </div>
  );
}
