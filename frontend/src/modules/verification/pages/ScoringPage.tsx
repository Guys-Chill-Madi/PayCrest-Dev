import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import BarChart from "../../../components/charts/BarChart";
import CibilGauge from "../../../components/charts/CibilGauge";
import "../../../styles/verification.css";
import { getSession } from '../../../modules/verification/services/verificationApi';

export default function ScoringPage(){
  const nav = useNavigate();
  const params = useParams();
  const entityType = (params.entityType ?? '').toLowerCase(); // 'kyc'
  const entityId = params.id || '';

  const [income, setIncome] = useState(0);
  const [employment, setEmployment] = useState(0);
  const [emi, setEmi] = useState(0);
  const [experience, setExperience] = useState(0);
  const [immutable, setImmutable] = useState(false);
  const [animTotal, setAnimTotal] = useState(0);
  const [animCibil, setAnimCibil] = useState(300);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "verification") {
      nav("/login/staff/verification");
      return;
    }
    const key = `kyc_scores_${entityId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (typeof s.income === 'number') setIncome(s.income);
        if (typeof s.employment === 'number') setEmployment(s.employment);
        if (typeof s.emi === 'number') setEmi(s.emi);
        if (typeof s.experience === 'number') setExperience(s.experience);
        setImmutable(true);
      } catch {
        // ignore
      }
    }
  }, [entityId]);

  const total = income + employment + emi + experience;
  const cibil = Math.max(300, Math.min(900, 300 + Math.round(total * 6)));

  useEffect(() => {
    // animate score changes for a more "live" feel
    const startTotal = animTotal;
    const startCibil = animCibil;
    const targetTotal = total;
    const targetCibil = cibil;
    const started = performance.now();
    const duration = 420;

    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimTotal(Math.round(startTotal + (targetTotal - startTotal) * ease));
      setAnimCibil(Math.round(startCibil + (targetCibil - startCibil) * ease));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, cibil]);

  const submit = () => {
    if (entityType !== 'kyc') {
      alert('Only KYC-level scoring is supported from this page.');
      return;
    }
    const key = `kyc_scores_${entityId}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        income, employment, emi, experience,
        total, cibil,
        submittedAt: Date.now(),
      }),
    );
    setImmutable(true);
    nav(`/verification/kyc/${encodeURIComponent(entityId)}`);
  };

  const tier = useMemo(() => {
    if (cibil < 580) return { key: "poor", label: "Poor", hint: "High risk — verify thoroughly.", color: "#ef4444" };
    if (cibil < 670) return { key: "fair", label: "Fair", hint: "Moderate risk — check stability.", color: "#f59e0b" };
    if (cibil < 740) return { key: "good", label: "Good", hint: "Balanced profile — proceed carefully.", color: "#2563eb" };
    return { key: "excellent", label: "Excellent", hint: "Strong profile — likely eligible.", color: "#22c55e" };
  }, [cibil]);

  const factors = useMemo(
    () => [
      { label: "Income", value: income, color: "#3b82f6" },
      { label: "Employment", value: employment, color: "#22c55e" },
      { label: "EMI", value: emi, color: "#f59e0b" },
      { label: "Experience", value: experience, color: "#8b5cf6" },
    ],
    [income, employment, emi, experience],
  );

  const totalPct = Math.max(0, Math.min(100, animTotal));
  const cibilPct = Math.max(0, Math.min(100, Math.round(((animCibil - 300) / 600) * 100)));

  return (
    <div className="verification-page">
      <div className="verification-container">
        <div className="vstack">
          <div className="verification-hero verification-hero--compact scoring-hero card-entrance">
            <div className="hero-main">
              <div className="brand">
                <img src={new URL("../../../styles/paycrest-logo.png", import.meta.url).href} alt="PayCrest" className="brand-logo" />
                <div>
                  <div className="brand-title">PayCrest</div>
                </div>
              </div>
              <div className="hero-title">Scoring & CIBIL</div>
              <div className="hero-sub">Score the applicant (0–25 each). CIBIL (300–900) is derived automatically.</div>
            </div>
            <div className="hero-actions">
              <span className="muted">KYC #{entityId}</span>
              <BackButton className="btn back" fallback="/verification" />
            </div>
          </div>

          <div className="scoring-grid">
            <div className="card scoring-panel card-entrance">
              <div className="scoring-head">
                <div>
                  <h3 style={{ margin: 0 }}>Manual Factors</h3>
                  <p className="muted" style={{ marginTop: 6 }}>
                    Tip: sliders feel faster than typing; values auto-clamp to 0–25.
                  </p>
                </div>
                <div className={`cibil-pill cibil-${tier.key}`} title={tier.hint}>
                  <span className="cibil-score">{animCibil}</span>
                  <span className="cibil-label muted">{tier.label}</span>
                </div>
              </div>

              <ScoreField
                icon="💰"
                label="Income Stability"
                value={income}
                onChange={setIncome}
                disabled={immutable}
                desc="Unstable → very stable"
              />
              <ScoreField
                icon="🧾"
                label="Employment Type"
                value={employment}
                onChange={setEmployment}
                disabled={immutable}
                desc="Unemployed → Govt/PSU"
              />
              <ScoreField
                icon="📉"
                label="Existing EMI Burden"
                value={emi}
                onChange={setEmi}
                disabled={immutable}
                desc="High burden → low burden"
              />
              <ScoreField
                icon="📄"
                label="Experience / Docs Quality"
                value={experience}
                onChange={setExperience}
                disabled={immutable}
                desc="Poor → excellent"
              />

              <div className="scoring-actions">
                <div className="muted">
                  Overall <strong className="scoring-total">{animTotal}</strong> / 100
                </div>
                <button className="btn primary" disabled={immutable} onClick={submit}>
                  {immutable ? "Scores Already Submitted" : "Submit Scores"}
                </button>
              </div>
            </div>

            <div className="card scoring-panel card-entrance">
              <div className="scoring-head">
                <div>
                  <h3 style={{ margin: 0 }}>Scoring Visuals</h3>
                  <p className="muted" style={{ marginTop: 6 }}>Hover the charts to see live values.</p>
                </div>
              </div>

              <div className="scoring-visuals">
                <div className="scoring-gauge">
                  <CibilGauge value={animCibil} accent={tier.color} ariaLabel="CIBIL gauge" />
                  <div className="scoring-gauge-meta">
                    <div className="scoring-gauge-title">CIBIL (derived)</div>
                    <div className="muted">{tier.hint}</div>
                  </div>

                  <div className="scoring-live" aria-label="Live scoring">
                    <div className="scoring-live__title">Live Scoring</div>
                    <div className="scoring-live__row">
                      <span className="muted">Total</span>
                      <strong style={{ color: "var(--text-primary)" }}>{animTotal}</strong>
                    </div>
                    <div className="scoring-live__bar" aria-hidden="true">
                      <span style={{ width: `${totalPct}%`, background: tier.color }} />
                    </div>
                    <div className="scoring-live__row" style={{ marginTop: 10 }}>
                      <span className="muted">CIBIL</span>
                      <strong style={{ color: "var(--text-primary)" }}>{animCibil}</strong>
                    </div>
                    <div className="scoring-live__bar" aria-hidden="true">
                      <span style={{ width: `${cibilPct}%`, background: tier.color }} />
                    </div>
                    <div className="scoring-live__tier" style={{ color: tier.color }}>
                      {tier.label}
                    </div>
                  </div>
                </div>

                <div className="card" style={{ padding: 14 }}>
                  <div className="analytics-head" style={{ marginBottom: 10 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>Factor Breakdown</h3>
                      <p className="muted" style={{ marginTop: 6 }}>Each factor out of 25.</p>
                    </div>
                  </div>
                  <BarChart data={factors} ariaLabel="Factor breakdown bar chart" valueFormatter={(v) => `${v}/25`} height={220} />
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreField({
  icon, label, value, onChange, disabled, desc
}: {
  icon: string; label:string; value:number; onChange:(v:number)=>void; disabled?:boolean; desc:string
}){
  return (
    <div className={`scoring-field ${disabled ? "is-disabled" : ""}`}>
      <div className="scoring-field__head">
        <div className="scoring-field__label">
          <span className="scoring-icon" aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </div>
        <div className="scoring-field__value">
          <strong>{value}</strong>
          <span className="muted">/25</span>
        </div>
      </div>
      <div className="muted scoring-field__desc">{desc}</div>

      <div className="scoring-inputs">
        <input
          className="scoring-slider"
          type="range"
          min={0}
          max={25}
          value={value}
          disabled={!!disabled}
          onChange={(e) => onChange(Math.max(0, Math.min(25, Number(e.target.value) || 0)))}
        />
        <input
          className="scoring-number"
          type="number"
          min={0}
          max={25}
          value={value}
          disabled={!!disabled}
          onChange={(e) => {
            let v = parseInt(e.target.value, 10);
            if (isNaN(v)) v = 0;
            v = Math.max(0, Math.min(25, v));
            onChange(v);
          }}
        />
      </div>
    </div>
  );
}




