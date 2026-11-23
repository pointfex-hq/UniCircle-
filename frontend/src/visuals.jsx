import React from 'react';

export function ItemVisual({ item }) {
  const photo = /^item-([0-5])$/.exec(item.id);
  if (photo) return <div className={'item-visual photo-tile photo-' + photo[1]} aria-hidden="true" />;
  return item.photoUrl
    ? <img className="item-visual" src={item.photoUrl} alt={item.title} />
    : <div aria-hidden="true" className="item-visual placeholder"><small>{item.category?.name}</small></div>;
}

export function Badge({ children }) {
  return <span className="badge">{children}</span>;
}
