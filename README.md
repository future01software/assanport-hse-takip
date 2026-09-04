# Assan Port — HSE Eğitim ve Belge Takip

Personel eğitim, sertifika ve sağlık raporu geçerliliğini takip eden, telefona
kurulabilen (PWA) tek sayfalık web uygulaması. Veri **Firebase Realtime
Database**'de, kimlik doğrulama **Firebase Authentication**'da tutulur.

> ⚠️ **Bu depo kişisel veri içermez ve içermemelidir.** Personel adları, sicil
> numaraları ve sağlık raporu bilgileri yalnızca Firebase veritabanında durur.
> `.gitignore` yedek JSON dosyalarını dışarıda tutar; bu kuralı gevşetmeyin.

---

## İçerik

```
public/
  index.html              Uygulamanın tamamı (HTML + CSS + JS)
  manifest.webmanifest    PWA tanımı
  sw.js                   Service worker (yalnız uygulama kabuğunu önbelleğe alır)
  icons/                  Uygulama ikonları
database.rules.json       Realtime Database güvenlik kuralları
firebase.json             Hosting + kural dağıtım ayarları
.firebaserc               Firebase proje kimliği
```

---

## Yetkilendirme modeli

Yetki artık kodda değil, veritabanında tutulur ve **sunucu tarafında** uygulanır:

```
/roles/<firebase-auth-uid>
    email:     "ad.soyad@assanport.com"
    role:      "admin" | "viewer"
    active:    true | false
    createdAt: "2026-09-04T..."
    createdBy: "admin@assanport.com"
```

| Rol | Yetki |
|---|---|
| `admin` | Tüm ekranlar, veri düzenleme, Firebase'e kaydetme, Excel/CSV/JSON dışa aktarma, kullanıcı yönetimi |
| `viewer` | Yönetim Paneli, Personel, Eğitim, Sağlık Raporları — yalnızca görüntüleme |
| rol kaydı yok | Giriş yapsa bile **hiçbir veriye erişemez**; oturumu kapatılır |

`database.rules.json` bu kontrolü veritabanı seviyesinde zorunlu kılar. Tarayıcı
konsolundan JavaScript değiştirerek yetki yükseltmek mümkün değildir: okuma ve
yazma izinleri istemciye değil, `/roles` düğümüne bakar.

---

## İlk kurulum

Gereksinim: [Firebase CLI](https://firebase.google.com/docs/cli) (`npm i -g firebase-tools`).

### 1. Güvenlik kurallarını yayına al  ← **önce bunu yapın**

```bash
firebase login
firebase deploy --only database
```

Bu adım tamamlanana kadar veritabanı herkese açık olabilir.

### 2. İlk admin kullanıcısını oluştur

Firebase Console → **Authentication → Users → Add user** ile bir hesap açın ve
oluşan **UID**'yi kopyalayın. Ardından **Realtime Database** ekranında elle şu
düğümü ekleyin:

```
/roles/<kopyaladığınız-UID>
    email:  "ad.soyad@assanport.com"
    role:   "admin"
    active: true
```

Bu tek seferlik bir işlemdir. Sonraki tüm kullanıcılar uygulama içindeki
**Sistem Yönetimi → Yeni Kullanıcı Ekle** ekranından açılır (hem Authentication
hesabı hem rol kaydı otomatik oluşur, şifre veritabanına yazılmaz).

### 3. Eski veriyi temizle

Realtime Database'de eski sürümden kalan **`/isg_egitim_takip/users`** düğümünü
silin. Bu düğüm portal şifrelerini **düz metin** tutuyordu; yeni kurallar bu
düğüme yazmayı engeller, ancak mevcut kaydı otomatik silmez.

### 4. Uygulamayı yayına al

```bash
firebase deploy --only hosting
```

### 5. Personel verisini yükle

Admin olarak giriş yapın → **JSON Yükle** ile yedek dosyanızı seçin →
**Firebase'e Kaydet**. Veri artık tüm kullanıcılara canlı olarak dağıtılır.

---

## Yerel geliştirme

```bash
firebase emulators:start        # veya
python3 -m http.server 8080 --directory public
```

`file://` üzerinden açmayın: ES modülleri ve service worker çalışmaz.

---

## PWA davranışı

- Chrome/Edge/Safari'de "Ana ekrana ekle" ile kurulabilir, ayrı pencerede açılır.
- Service worker **yalnızca uygulama kabuğunu** (HTML/ikon/CDN kütüphaneleri)
  önbelleğe alır. **Personel verisi hiçbir zaman önbelleğe alınmaz** —
  veritabanı trafiği service worker'dan geçmez.
- Çevrimdışıyken uygulama açılır ancak veri gösteremez; bağlantı gelince
  Firebase kaldığı yerden canlı veriyi akıtır.
- `sw.js` içindeki `VERSION` değerini her yayında artırın; eski önbellek
  otomatik temizlenir.

---

## Sürüm 4.6 → bu sürüm: değişenler

| Önce | Sonra |
|---|---|
| `admin@local / 123456` kodun içinde sabit | Kaldırıldı; yalnızca Firebase Authentication |
| Portal şifreleri veritabanında **düz metin** | Şifre hiç saklanmıyor; Authentication yönetiyor |
| Admin e-postaları koda gömülü | `/roles` düğümü + veritabanı kuralları |
| Rol kontrolü yalnızca CSS gizleme (konsoldan aşılabilir) | Sunucu tarafı kurallar |
| 255 personelin verisi HTML dosyasına gömülü | Gömülü veri kaldırıldı; kaynak yalnızca Firebase |
| `set()` ile tam düğüm üzerine yazma | `update()` — `/roles` düğümü korunuyor |
| Kurulamayan tek dosya | PWA: manifest + service worker + ikonlar |

---

## Bilinen sınırlar

- **Kullanıcı silme:** "Yetkiyi Sil" veri erişimini anında keser ama Firebase
  Authentication hesabını silmez; hesabı konsoldan da silin.
- **Şifre sıfırlama** ekranı yok; Firebase Console'dan yapılır.
- **Denetim kaydı (audit log)** yok; yalnızca son kaydeden kullanıcı
  (`updatedBy`) tutulur.
- Veritabanı kuralları rol kontrolü yapar ancak **alan bazlı doğrulama sınırlıdır**;
  admin yetkisi olan bir kullanıcı tüm personel verisini değiştirebilir.
