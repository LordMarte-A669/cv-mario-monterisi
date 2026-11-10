# CV di Mario Monterisi

Pubblicato su <https://lordmarte-a669.github.io/cv-mario-monterisi/>.

Tutto il CV sta in `index.html`. Ogni testo che cambia con la lingua ha un
attributo `data-i18n` e due traduzioni nel dizionario `I18N`, in fondo alla
pagina: per modificare un testo si cambia nell'HTML **e** in `I18N.it`, e si
aggiorna `I18N.en`.

I PDF non stanno nel repository: a ogni push su `main` la Action
`Pubblica il CV` controlla le traduzioni, genera
`CV_Mario_Monterisi.pdf` e `CV_Mario_Monterisi_EN.pdf` e pubblica il sito. Se
manca una traduzione, o il testo nell'HTML è diverso da `I18N.it`, si ferma e
il sito resta com'era.

Per provare in locale prima del push (serve Chrome installato):

    npm install
    npm run pdf        # sito e PDF in _site/

Lo script avvisa se un PDF supera le due pagine.
