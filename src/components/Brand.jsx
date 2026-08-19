import logo from "../assets/brand/tier-list-logo.png";

export default function Brand({ compact = false, onClick }) {
  return (
    <button
      className={`brand ${compact ? "brand-compact" : ""}`}
      onClick={onClick}
      aria-label="На главную"
      type="button"
    >
      <span className="brand-mark" aria-hidden="true">
        <img src={logo} alt="" />
      </span>
      <span className="brand-wordmark">TIER LIST</span>
    </button>
  );
}
