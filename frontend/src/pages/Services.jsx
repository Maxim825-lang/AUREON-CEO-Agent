import React, { useEffect, useState } from 'react'
import { getServicesCatalog } from '../api/client.js'
import { AUREON_SERVICES_FALLBACK } from '../api/mockData.js'
import Button from '../components/Button.jsx'

export default function Services() {
  const [services, setServices] = useState([])

  useEffect(() => {
    getServicesCatalog()
      .then(setServices)
      .catch(() => setServices(AUREON_SERVICES_FALLBACK))
  }, [])

  return (
    <div style={{ maxWidth: 1000, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', margin: 0 }}>
          Services & Pricing
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Готовые AI-решения AUREON — реальные продукты, реальные цены
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
        {services.map(s => (
          <ServiceCard key={s.id} service={s} />
        ))}
      </div>

      <div style={{
        marginTop: '24px',
        padding: '16px 20px',
        background: 'rgba(212,175,55,0.04)',
        border: '1px solid var(--border-gold)',
        borderRadius: 'var(--radius-lg)',
        fontSize: '12px',
        color: 'var(--text-muted)',
        lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 600, color: 'var(--gold)', marginBottom: '6px' }}>Как работает AUREON</div>
        Все цены — стартовые. Финальная стоимость зависит от сложности и требований клиента.
        Оплата: 50% предоплата, 50% после сдачи. Гарантия: 1 месяц поддержки включена.
        Контакт: <span style={{ color: 'var(--gold)' }}>@aureon_ai</span> в Telegram.
      </div>
    </div>
  )
}

function ServiceCard({ service }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid var(--border)`,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = `${service.color}30`}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ padding: '16px', borderLeft: `3px solid ${service.color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>{service.icon}</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
                {service.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                {service.timeline}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: service.color, fontFamily: 'Space Grotesk' }}>
              от ${service.price_from}
            </div>
            {service.price_to && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                до ${service.price_to}
              </div>
            )}
          </div>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>
          {service.description}
        </p>

        <div style={{ marginBottom: '10px' }}>
          {service.features?.slice(0, expanded ? undefined : 3).map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
              <span style={{ color: service.color, fontSize: '10px', marginTop: '1px', flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{f}</span>
            </div>
          ))}
          {service.features?.length > 3 && (
            <button onClick={() => setExpanded(!expanded)} style={{
              background: 'none', border: 'none', color: service.color,
              fontSize: '10px', cursor: 'pointer', padding: '2px 0',
            }}>
              {expanded ? '▲ свернуть' : `▼ ещё ${service.features.length - 3}`}
            </button>
          )}
        </div>

        {service.roi_example && (
          <div style={{
            background: `${service.color}08`,
            border: `1px solid ${service.color}20`,
            borderRadius: '5px',
            padding: '7px 10px',
            fontSize: '10px',
            color: service.color,
            marginBottom: '10px',
          }}>
            ROI: {service.roi_example}
          </div>
        )}

        {service.ideal_for?.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {service.ideal_for.map(t => (
              <span key={t} style={{
                fontSize: '9px', padding: '2px 6px', borderRadius: '4px',
                background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.01)',
        display: 'flex',
        gap: '8px',
      }}>
        <button
          onClick={() => navigator.clipboard?.writeText(`Интересует услуга "${service.name}" от $${service.price_from}. Расскажите подробнее.`)}
          style={{
            flex: 1, background: `${service.color}12`, border: `1px solid ${service.color}30`,
            color: service.color, borderRadius: '6px', padding: '6px', fontSize: '11px',
            cursor: 'pointer', fontWeight: 500,
          }}>
          Копировать запрос
        </button>
      </div>
    </div>
  )
}
