import { useState, useMemo } from 'react';
import { Search, Star, ExternalLink, BookOpen } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/common';
import { mockLegalReferences } from '@/data/mockData';

const LeggiPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(mockLegalReferences.map(r => r.categoria));
    return Array.from(cats);
  }, []);

  const filteredReferences = useMemo(() => {
    return mockLegalReferences.filter(ref => {
      const matchesSearch = !searchQuery || 
        ref.titolo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ref.descrizione_breve.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || ref.categoria === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const favorites = filteredReferences.filter(r => r.preferito);
  const others = filteredReferences.filter(r => !r.preferito);

  return (
    <AppLayout title="Leggi" showFAB={false}>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca normativa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Category Tags */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            Tutte
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Favorites */}
        {favorites.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-warning" />
              Preferiti
            </h3>
            {favorites.map(ref => (
              <div key={ref.id} className="mobile-card">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{ref.titolo}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{ref.descrizione_breve}</p>
                    {ref.testo_nota_rapida && (
                      <div className="mt-2 p-2 bg-muted rounded-lg text-xs text-muted-foreground">
                        {ref.testo_nota_rapida}
                      </div>
                    )}
                    <a
                      href={ref.url_ufficiale}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {ref.fonte_ufficiale}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* All References */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Normativa</h3>
          {others.map(ref => (
            <div key={ref.id} className="mobile-card">
              <div className="flex items-start justify-between mb-2">
                <StatusBadge status="info">{ref.categoria}</StatusBadge>
              </div>
              <h4 className="font-medium text-foreground">{ref.titolo}</h4>
              <p className="text-sm text-muted-foreground mt-1">{ref.descrizione_breve}</p>
              <a
                href={ref.url_ufficiale}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Consulta fonte ufficiale
              </a>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default LeggiPage;
