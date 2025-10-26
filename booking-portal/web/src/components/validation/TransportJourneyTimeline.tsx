import React from 'react';

interface TransportJourneyTimelineProps {
  formData: any;
}

export const TransportJourneyTimeline: React.FC<TransportJourneyTimelineProps> = ({ formData }) => {
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return 'Not specified';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getTransportModeIcon = (mode: string): string => {
    const icons: Record<string, string> = {
      'TRUCK': '🚛',
      'RAIL': '🚂',
      'BARGE': '🚢',
      'VESSEL': '⛴️',
      'RAIL_TRUCK': '🚂🚛',
      'BARGE_TRUCK': '🚢🚛',
      'BARGE_RAIL': '🚢🚂'
    };
    return icons[mode] || '🚛';
  };

  const getStatusColor = (status?: string): string => {
    const colors: Record<string, string> = {
      'planned': '#f59e0b',
      'in_transit': '#3b82f6',
      'delivered': '#10b981',
      'cancelled': '#ef4444'
    };
    return colors[status || 'planned'] || '#64748b';
  };

  const getStatusLabel = (status?: string): string => {
    const labels: Record<string, string> = {
      'planned': 'Planned',
      'in_transit': 'In Transit',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return labels[status || 'planned'] || 'Unknown';
  };

  // Check if we have multi-leg journey data
  const hasTransportLegs = formData.transportLegs && formData.transportLegs.length > 0;

  return (
    <div style={{
      background: '#f8fafc',
      borderRadius: '8px',
      padding: '20px',
      border: '1px solid #e2e8f0',
      marginBottom: '24px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Transport Journey</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>
            {getTransportModeIcon(formData.transportMode || 'TRUCK')}
          </span>
          <span style={{
            padding: '4px 12px',
            background: getStatusColor(formData.transportStatus),
            color: 'white',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600
          }}>
            {getStatusLabel(formData.transportStatus)}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute',
          left: '20px',
          top: '30px',
          bottom: '30px',
          width: '3px',
          background: formData.actualDeliveryDate ? '#10b981' : (formData.actualPickupDate ? '#3b82f6' : '#cbd5e1')
        }} />

        {hasTransportLegs ? (
          // Multi-leg journey display
          <>
            {formData.transportLegs.map((leg: any, index: number) => {
              const isFirstLeg = index === 0;
              const isLastLeg = index === formData.transportLegs.length - 1;

              return (
                <React.Fragment key={index}>
                  {/* Origin point (only show for first leg) */}
                  {isFirstLeg && (
                    <div style={{ position: 'relative', paddingLeft: '50px', marginBottom: '30px' }}>
                      <div style={{
                        position: 'absolute',
                        left: '8px',
                        top: '8px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#10b981',
                        border: '3px solid white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: 'white'
                      }}>
                        ✓
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', color: '#10b981' }}>
                          Origin
                        </div>
                        <div style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
                          {leg.origin.name}
                        </div>
                        {leg.origin.address && (
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {leg.origin.address}
                          </div>
                        )}
                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
                          {formatDate(leg.departureDate)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transport leg */}
                  <div style={{ position: 'relative', paddingLeft: '50px', marginBottom: '30px' }}>
                    <div style={{
                      position: 'absolute',
                      left: '11px',
                      top: '8px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'white',
                      border: '3px solid #3b82f6',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }} />
                    <div style={{
                      background: '#eff6ff',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      border: '1px solid #dbeafe'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '18px' }}>
                          {getTransportModeIcon(leg.transportMode)}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>
                          Leg {leg.legNumber}: {leg.transportMode}
                        </span>
                      </div>
                      {leg.vesselName && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                          Vessel: <span style={{ fontWeight: 500, color: '#334155' }}>{leg.vesselName}</span>
                          {leg.voyageNumber && ` (Voyage ${leg.voyageNumber})`}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {formatDate(leg.departureDate)} → {formatDate(leg.arrivalDate)}
                      </div>
                    </div>
                  </div>

                  {/* Destination point */}
                  <div style={{ position: 'relative', paddingLeft: '50px', marginBottom: isLastLeg ? '0' : '30px' }}>
                    <div style={{
                      position: 'absolute',
                      left: '8px',
                      top: '8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isLastLeg ? '#10b981' : '#f59e0b',
                      border: '3px solid white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: 'white'
                    }}>
                      {isLastLeg ? '✓' : '📍'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', color: isLastLeg ? '#10b981' : '#f59e0b' }}>
                        {isLastLeg ? 'Final Destination' : 'Transfer Point'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
                        {leg.destination.name}
                      </div>
                      {leg.destination.address && (
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {leg.destination.address}
                        </div>
                      )}
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
                        {formatDate(leg.arrivalDate)}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </>
        ) : (
          // Simple pickup/delivery display (fallback for legacy data)
          <>
            {/* Pickup */}
            <div style={{ position: 'relative', paddingLeft: '50px', marginBottom: '40px' }}>
              <div style={{
                position: 'absolute',
                left: '8px',
                top: '8px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: formData.actualPickupDate ? '#10b981' : '#f59e0b',
                border: '3px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}>
                {formData.actualPickupDate ? '✓' : '📍'}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                  Pickup
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                  {formData.pickupLocation?.name || 'Not specified'}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {formData.pickupLocation?.address}
                </div>
                <div style={{ marginTop: '8px', fontSize: '13px' }}>
                  <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '2px' }}>
                    {formData.actualPickupDate ? 'Actual' : 'Planned'}
                  </div>
                  <div style={{ fontWeight: 500, color: formData.actualPickupDate ? '#10b981' : '#1e293b' }}>
                    {formatDate(formData.actualPickupDate || formData.plannedPickupDate)}
                  </div>
                </div>
              </div>
            </div>

            {/* In Transit */}
            {formData.actualPickupDate && !formData.actualDeliveryDate && (
              <div style={{ position: 'relative', paddingLeft: '50px', marginBottom: '40px' }}>
                <div style={{
                  position: 'absolute',
                  left: '14px',
                  top: '8px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  animation: 'pulse 2s infinite'
                }} />
                <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                  In transit...
                </div>
              </div>
            )}

            {/* Delivery */}
            <div style={{ position: 'relative', paddingLeft: '50px' }}>
              <div style={{
                position: 'absolute',
                left: '8px',
                top: '8px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: formData.actualDeliveryDate ? '#10b981' : '#cbd5e1',
                border: '3px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}>
                {formData.actualDeliveryDate ? '✓' : '📦'}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                  Delivery
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                  {formData.deliveryLocation?.name || 'Not specified'}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {formData.deliveryLocation?.address}
                </div>
                <div style={{ marginTop: '8px', fontSize: '13px' }}>
                  <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '2px' }}>
                    {formData.actualDeliveryDate ? 'Actual' : 'Planned'}
                  </div>
                  <div style={{ fontWeight: 500, color: formData.actualDeliveryDate ? '#10b981' : '#1e293b' }}>
                    {formatDate(formData.actualDeliveryDate || formData.plannedDeliveryDate)}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Containers */}
      {formData.containers && formData.containers.length > 0 && (
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 500 }}>
            Containers ({formData.containers.length})
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {formData.containers.map((container: any, idx: number) => (
              <span key={idx} style={{
                padding: '6px 10px',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#334155'
              }}>
                {container.containerNumber}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
