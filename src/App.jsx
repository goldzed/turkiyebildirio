// Türkiye Bildiriyo - Topluluk Haritası
// Canlı Katılımcı Sayısı eklendi
import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { Megaphone, AlertTriangle, HeartHandshake, Lightbulb, Info, PieChart, X } from 'lucide-react';

export default function HomePage() {
  const [participantCount, setParticipantCount] = useState(Math.floor(Math.random() * 900000) + 100000);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [durum, setDurum] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [bildirimler, setBildirimler] = useState([]);
  const [mapRef, setMapRef] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [heatLayer, setHeatLayer] = useState(null);
  const [hata, setHata] = useState('');
  const [filtreSehir, setFiltreSehir] = useState('');
  const mapContainerRef = useRef(null);

  const renkKodlari = {
    'Öneri': 'green',
    'Şikayet': 'red',
    'Uyarı': 'orange',
    'Yardım Talebi': 'purple',
    'Bilgilendirme': 'blue'
  };

  const durumClassMap = {
    'Öneri': 'bg-green-50 border-green-200 text-green-800',
    'Şikayet': 'bg-red-50 border-red-200 text-red-800',
    'Uyarı': 'bg-orange-50 border-orange-200 text-orange-800',
    'Yardım Talebi': 'bg-purple-50 border-purple-200 text-purple-800',
    'Bilgilendirme': 'bg-blue-50 border-blue-200 text-blue-800'
  };

  useEffect(() => {
    const sahteBildirimler = [
      {
        konum: 'İstanbul / Kadıköy',
        durum: 'Öneri',
        aciklama: 'Toplu taşıma düzenlemeleri geliştirilmeli.',
        sehir: 'İstanbul / Kadıköy',
        tarih: '26.03.2025',
        saat: '14:12'
      },
      {
        konum: 'Ankara / Kızılay',
        durum: 'Şikayet',
        aciklama: 'Trafik ışıkları çok kısa sürede değişiyor.',
        sehir: 'Ankara / Kızılay',
        tarih: '26.03.2025',
        saat: '14:10'
      },
      {
        konum: 'İzmir / Alsancak',
        durum: 'Uyarı',
        aciklama: 'Kaldırımda tehlikeli çukur mevcut.',
        sehir: 'İzmir / Alsancak',
        tarih: '26.03.2025',
        saat: '14:08'
      },
      {
        konum: 'Antalya / Lara',
        durum: 'Bilgilendirme',
        aciklama: 'Bugün denetimler yapılacağı bildirildi.',
        sehir: 'Antalya / Lara',
        tarih: '26.03.2025',
        saat: '14:06'
      },
      {
        konum: 'Gaziantep / Şahinbey',
        durum: 'Yardım Talebi',
        aciklama: 'Mahallede elektrik kesintisi yaşanıyor.',
        sehir: 'Gaziantep / Şahinbey',
        tarih: '26.03.2025',
        saat: '14:05'
      },
      {
        konum: 'Eskişehir / Odunpazarı',
        durum: 'Öneri',
        aciklama: 'Daha fazla bisiklet yolu yapılmalı.',
        sehir: 'Eskişehir / Odunpazarı',
        tarih: '26.03.2025',
        saat: '14:04'
      }
    ];
    setBildirimler(sahteBildirimler);

    const interval = setInterval(() => {
      const variation = Math.floor(Math.random() * 2 + 2);
      setParticipantCount((prev) => Math.min(1000000, prev + variation));
    }, 10000);

    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView([38.9637, 35.2433], 6);
    map.setMaxBounds([
      [35.81, 25.89],
      [42.1, 45.0]
    ]);
    setMapRef(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap katkıcıları'
    }).addTo(map);

    const heat = L.heatLayer([], { radius: 20, blur: 15, maxZoom: 12 }).addTo(map);
    setHeatLayer(heat);

    map.on('click', async function (e) {
      const { lat, lng } = e.latlng;

      if (lat < 35.81 || lat > 42.1 || lng < 25.89 || lng > 45.0) {
        alert('Yalnızca Türkiye sınırları içinde seçim yapabilirsiniz.');
        return;
      }

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        const city = data.address.city || data.address.town || data.address.village || 'Bilinmiyor';
        const district = data.address.suburb || data.address.neighbourhood || data.address.county || '';
        const fullLocation = `${city}${district ? ' / ' + district : ''}`;
        setSelectedCoords(fullLocation);
        setSelectedLocation(fullLocation);
        setFiltreSehir(city);
        map.setView([lat, lng], map.getZoom());
      } catch {
        setSelectedCoords('Bilinmiyor');
        setSelectedLocation('Bilinmiyor');
      }
    });

    return () => {
      clearInterval(interval);
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!heatLayer) return;
    heatLayer.setLatLngs([]);
    bildirimler.forEach(async ({ konum, sehir }) => {
      if (!filtreSehir || sehir.startsWith(filtreSehir)) {
        const latLng = await fetchLatLngFromAddress(konum);
        if (latLng) heatLayer.addLatLng([latLng.lat, latLng.lng]);
      }
    });
  }, [bildirimler, heatLayer, filtreSehir]);

  const handleBildir = () => {
    if (!selectedCoords || !durum || aciklama.length < 20 || aciklama.length > 80) {
      setHata('Tüm alanları doldurun ve açıklama 20-80 karakter aralığında olsun.');
      return;
    }
    setHata('');

    fetchLatLngFromAddress(selectedCoords).then((latLng) => {
      if (!latLng || !mapRef) return;

      const now = new Date();
      const tarih = now.toLocaleDateString('tr-TR');
      const saat = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const yeni = {
        konum: selectedCoords,
        durum,
        aciklama,
        sehir: selectedLocation || 'Bilinmiyor',
        tarih,
        saat
      };
      setBildirimler((prev) => [yeni, ...prev.slice(0, 49)]);

      const { lat, lng } = latLng;
      const renk = renkKodlari[durum] || 'gray';
      const offsetLat = lat + (Math.random() - 0.5) * 0.001;
      const offsetLng = lng + (Math.random() - 0.5) * 0.001;

      const popupHTML = `
        <div style="font-family: sans-serif; font-size: 13px; max-width: 250px;">
          <strong style="font-size: 14px; color: ${renk}">${durum}</strong><br />
          <span style="color: #444; display: block; margin-bottom: 4px; max-height: 60px; overflow: hidden;">${aciklama}</span>
          <span style="color: gray">📍 ${selectedLocation}</span><br />
          <span style="font-size: 11px; color: #888">🕒 ${saat} - ${tarih}</span>
        </div>
      `;

      const circle = L.circle([offsetLat, offsetLng], {
        color: renk,
        fillColor: renk,
        fillOpacity: 0.5,
        radius: 100
      }).addTo(mapRef);
      circle.bindPopup(popupHTML).openPopup();

      heatLayer && heatLayer.addLatLng([lat, lng]);
    });

    setDurum('');
    setAciklama('');
  };

  const fetchLatLngFromAddress = async (address) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    } catch (error) {
      console.error('Konum alınamadı:', error);
    }
    return null;
  };

  const getIcon = (tip) => {
    switch (tip) {
      case 'Öneri': return <Lightbulb className="w-4 h-4 text-green-700" />;
      case 'Şikayet': return <AlertTriangle className="w-4 h-4 text-red-700" />;
      case 'Uyarı': return <Megaphone className="w-4 h-4 text-orange-700" />;
      case 'Yardım Talebi': return <HeartHandshake className="w-4 h-4 text-purple-700" />;
      case 'Bilgilendirme': return <Info className="w-4 h-4 text-blue-700" />;
      default: return <Info className="w-4 h-4 text-gray-700" />;
    }
  };

  const getFormattedCount = (num) => num.toLocaleString('tr-TR');

  const kategoriSayac = {};
  bildirimler.forEach(({ durum }) => {
    kategoriSayac[durum] = (kategoriSayac[durum] || 0) + 1;
  });
  const populerKategoriler = Object.entries(kategoriSayac).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="min-h-screen bg-white p-4">
      <header className="text-center mb-4 border-b pb-2">
        <h1 className="text-3xl font-bold">TÜRKİYE BİLDİRİYO</h1>
        <p className="text-xs text-gray-500">Haritaya tıklayarak bulunduğun bölgeyi filtreleyebilir, bildirimleri o bölgeye göre görebilirsin.</p>
      </header>

      <div ref={mapContainerRef} id="map" className="w-full h-[400px] rounded-2xl border mb-6"></div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:max-w-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">📢 Bildirim Sayısı</h3>
          <div className="bg-green-800 text-center py-4 rounded-xl animate-pulse">
            <span className="text-white text-xs block">CANLI</span>
            <span className="text-green-100 text-2xl font-bold">{getFormattedCount(participantCount)}+</span>
          </div>

          <div className="border border-gray-300 p-4 rounded-xl bg-gray-50">
            <h2 className="font-semibold mb-3 text-gray-700">Bildirim Gönder</h2>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input type="text" value={selectedCoords || ''} readOnly className="border rounded-xl p-2 text-sm bg-gray-100 cursor-default" placeholder="Haritadan Seç" />
              <select className="border rounded-xl p-2 text-sm" value={durum} onChange={(e) => setDurum(e.target.value)}>
                <option value="">Kategori Seç</option>
                <option>Öneri</option>
                <option>Şikayet</option>
                <option>Uyarı</option>
                <option>Yardım Talebi</option>
                <option>Bilgilendirme</option>
              </select>
            </div>
            <textarea minLength={20} maxLength={80} value={aciklama} onChange={(e) => setAciklama(e.target.value)} className="w-full border rounded-xl p-2 text-sm mb-1" placeholder="Açıklama (20-80 karakter arası)" />
            <p className="text-xs text-right text-gray-500 mb-1">{aciklama.length} / 80 karakter</p>
            {hata && <p className="text-xs text-red-500 mb-2">{hata}</p>}
            <button onClick={handleBildir} className="w-full bg-black text-white text-sm py-2 rounded-xl">GÖNDER</button>
          </div>

          <div className="border border-gray-200 p-4 rounded-xl bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <PieChart className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-gray-700">En Çok Kullanılan Kategoriler</h3>
            </div>
            <ul className="text-sm space-y-2">
              {populerKategoriler.map(([kategori, adet], index) => (
                <li key={index} className="flex justify-between items-center px-3 py-1 bg-gray-50 border rounded-xl">
                  <span className="text-gray-700 font-medium">{kategori}</span>
                  <span className="text-xs text-gray-500 font-semibold">{adet} bildirim</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
  <h2 className="font-semibold text-gray-700">Son Bildirimler</h2>
  {filtreSehir && (
    <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
      📍 Seçilen Bölge: <strong>{filtreSehir}</strong>
      <button
        onClick={() => {
          setFiltreSehir('');
          if (mapRef) mapRef.setView([38.9637, 35.2433], 6);
        }}
        className="hover:text-red-500"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )}
</div>
          <div className="grid gap-3">
            {(filtreSehir ? bildirimler.filter(item => item.sehir.startsWith(filtreSehir)) : bildirimler.slice(0, 6)).map((item, index) => (
              <div key={index} className={`${durumClassMap[item.durum] || 'bg-gray-50 border-gray-200 text-gray-800'} p-4 rounded-xl text-sm relative`}>
                <div className="absolute top-2 right-3 text-xs text-gray-500">{item.sehir}</div>
                <div className="flex items-center gap-2 mb-1">
                  {getIcon(item.durum)}
                  <span className="font-medium">{item.durum}</span>
                </div>
                <p style={{ maxHeight: '4.5rem', overflow: 'hidden', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>{item.aciklama}</p>
                <p className="text-xs text-gray-500 mt-1">🕒 {item.saat} - {item.tarih}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
