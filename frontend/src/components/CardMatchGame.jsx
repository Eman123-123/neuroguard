import { useState, useEffect, useRef } from "react";

const CARD_SYMBOLS = [
  { id: "apple", icon: "🍎", name: "Apple" },
  { id: "key", icon: "🔑", name: "Key" },
  { id: "house", icon: "🏠", name: "House" },
  { id: "car", icon: "🚗", name: "Car" },
  { id: "clock", icon: "⏰", name: "Clock" },
  { id: "bulb", icon: "💡", name: "Lightbulb" },
];

function shuffleCards() {
  const deck = [...CARD_SYMBOLS, ...CARD_SYMBOLS].map((item, index) => ({
    uniqueId: `${item.id}-${index}`,
    symbolId: item.id,
    icon: item.icon,
    name: item.name,
    isFlipped: false,
    isMatched: false,
  }));
  return deck.sort(() => Math.random() - 0.5);
}

export default function CardMatchGame({ onTelemetrySave, onNavigateToRisk }) {
  const [cards, setCards] = useState(shuffleCards);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [moves, setMoves] = useState(0);
  const [errors, setErrors] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [seenCards, setSeenCards] = useState(new Set());

  const timerRef = useRef(null);

  // Timer loop
  useEffect(() => {
    if (gameStarted && !gameFinished) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => +(prev + 0.5).toFixed(1));
      }, 500);
    }
    return () => clearInterval(timerRef.current);
  }, [gameStarted, gameFinished]);

  // Handle card click
  const handleCardClick = (index) => {
    if (flippedCards.length === 2) return;
    const card = cards[index];
    if (card.isFlipped || card.isMatched) return;

    if (!gameStarted) {
      setGameStarted(true);
    }

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, { index, ...card }];
    setFlippedCards(newFlipped);

    // If 2 cards flipped, check match
    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [cardA, cardB] = newFlipped;

      if (cardA.symbolId === cardB.symbolId) {
        // Matched!
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === cardA.index || i === cardB.index
                ? { ...c, isMatched: true, isFlipped: true }
                : c
            )
          );
          setFlippedCards([]);
          setMatchedCount((m) => {
            const next = m + 1;
            if (next === CARD_SYMBOLS.length) {
              finishGame();
            }
            return next;
          });
        }, 500);
      } else {
        // Error check: did user flip a card they already saw earlier?
        const alreadySeen =
          seenCards.has(cardA.uniqueId) || seenCards.has(cardB.uniqueId);
        if (alreadySeen) {
          setErrors((e) => e + 1);
        }

        setSeenCards((prev) => {
          const nextSet = new Set(prev);
          nextSet.add(cardA.uniqueId);
          nextSet.add(cardB.uniqueId);
          return nextSet;
        });

        // Flip back
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === cardA.index || i === cardB.index
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedCards([]);
        }, 900);
      }
    }
  };

  const finishGame = () => {
    clearInterval(timerRef.current);
    setGameFinished(true);

    const finalMoves = moves + 1;
    const finalTime = seconds;
    const errorRate = finalMoves > 0 ? +(errors / finalMoves).toFixed(3) : 0.1;

    const telemetry = {
      moves: finalMoves,
      time_sec: finalTime,
      errors: errors,
      error_rate: errorRate,
    };

    if (onTelemetrySave) {
      onTelemetrySave(telemetry);
    }
  };

  const resetGame = () => {
    clearInterval(timerRef.current);
    setCards(shuffleCards());
    setFlippedCards([]);
    setMatchedCount(0);
    setMoves(0);
    setErrors(0);
    setSeconds(0);
    setGameStarted(false);
    setGameFinished(false);
    setSeenCards(new Set());
  };

  return (
    <div className="card-game-container">
      <div className="game-header">
        <div>
          <h2>🧠 Visuospatial Working Memory Test</h2>
          <p className="subtitle">
            Match all 6 pairs of cards. This test evaluates working memory and short-term recall speed.
          </p>
        </div>
        <button onClick={resetGame} className="btn-secondary">
          🔄 Reset Game
        </button>
      </div>

      {/* Telemetry Dashboard Strip */}
      <div className="metrics-strip">
        <div className="metric-box">
          <span className="metric-label">⏱️ Time Elapsed</span>
          <span className="metric-val">{seconds.toFixed(1)}s</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">🎯 Total Moves</span>
          <span className="metric-val">{moves}</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">⚠️ Memory Errors</span>
          <span className="metric-val">{errors}</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">✅ Pairs Matched</span>
          <span className="metric-val">{matchedCount} / 6</span>
        </div>
      </div>

      {/* Game Cards Grid */}
      <div className="cards-grid">
        {cards.map((card, idx) => (
          <div
            key={card.uniqueId}
            onClick={() => handleCardClick(idx)}
            className={`memory-card ${card.isFlipped ? "flipped" : ""} ${
              card.isMatched ? "matched" : ""
            }`}
          >
            <div className="card-inner">
              <div className="card-front">
                <span className="card-icon">{card.icon}</span>
                <span className="card-label">{card.name}</span>
              </div>
              <div className="card-back">
                <span className="card-question">❓</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Completion Modal / Banner */}
      {gameFinished && (
        <div className="completion-card">
          <div className="completion-content">
            <h3>🎉 Test Completed!</h3>
            <p>
              Your cognitive telemetry was recorded successfully:
            </p>
            <div className="completion-stats">
              <span>⏱️ Completion Time: <strong>{seconds}s</strong></span>
              <span>🎯 Total Moves: <strong>{moves}</strong></span>
              <span>⚠️ Errors: <strong>{errors}</strong></span>
              <span>
                📊 Memory Accuracy:{" "}
                <strong>
                  {moves > 0 ? ((1 - errors / moves) * 100).toFixed(0) : 100}%
                </strong>
              </span>
            </div>
            <div className="completion-actions">
              <button
                className="btn-primary"
                onClick={() => onNavigateToRisk && onNavigateToRisk()}
              >
                📊 Run AI Risk Assessment With This Score →
              </button>
              <button className="btn-secondary" onClick={resetGame}>
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
