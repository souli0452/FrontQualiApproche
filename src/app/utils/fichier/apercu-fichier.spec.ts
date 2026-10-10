import { ouvrirOuEnregistrer, reemballer, typeAffichable } from './apercu-fichier';

/**
 * Ouverture des fichiers en onglet.
 *
 * <p>Une URL `blob:` s'exécute dans l'origine de l'application : ce qu'on vérifie ici, c'est
 * qu'aucun fichier capable de porter du script n'est jamais ouvert, quel que soit le nom qu'il se
 * donne, et que les PDF et images, eux, continuent de s'afficher.</p>
 */
describe('apercu-fichier', () => {

    describe('typeAffichable', () => {
        it('retient un PDF ou une image déclarés comme tels', () => {
            expect(typeAffichable(new Blob(['x'], { type: 'application/pdf' }), 'rapport.pdf'))
                .toBe('application/pdf');
            expect(typeAffichable(new Blob(['x'], { type: 'image/png' }), 'photo.png')).toBe('image/png');
        });

        it('refuse un fichier HTML, même nommé comme un PDF', () => {
            expect(typeAffichable(new Blob(['<script>'], { type: 'text/html' }), 'rapport.pdf')).toBeNull();
        });

        it('refuse le SVG, qui peut porter du script', () => {
            expect(typeAffichable(new Blob(['<svg/>'], { type: 'image/svg+xml' }), 'schema.svg')).toBeNull();
            expect(typeAffichable(new Blob(['<svg/>']), 'schema.svg')).toBeNull();
        });

        it('s\'en remet à l\'extension quand le type ne dit rien', () => {
            expect(typeAffichable(new Blob(['x'], { type: 'application/octet-stream' }), 'scan.JPG'))
                .toBe('image/jpeg');
            expect(typeAffichable(new Blob(['x']), 'tableau.xlsx')).toBeNull();
        });

        it('tient un nom sans extension pour un PDF seulement quand on le demande', () => {
            expect(typeAffichable(new Blob(['x']), 'DOC-2026-001')).toBeNull();
            expect(typeAffichable(new Blob(['x']), 'DOC-2026-001', true)).toBe('application/pdf');
        });
    });

    it('réemballe le contenu sous le type retenu', () => {
        const deguise = new Blob(['<html>'], { type: '' });

        expect(reemballer(deguise, 'application/pdf').type).toBe('application/pdf');
    });

    describe('ouvrirOuEnregistrer', () => {
        beforeEach(() => {
            spyOn(URL, 'createObjectURL').and.returnValue('blob:essai');
            spyOn(URL, 'revokeObjectURL');
            spyOn(window, 'open');
        });

        it('ouvre un PDF dans un nouvel onglet', () => {
            const ouvert = ouvrirOuEnregistrer(new Blob(['x'], { type: 'application/pdf' }), 'rapport.pdf');

            expect(ouvert).toBeTrue();
            expect(window.open).toHaveBeenCalledWith('blob:essai', '_blank');
        });

        it('enregistre un document bureautique au lieu de l\'ouvrir', () => {
            const clic = spyOn(HTMLAnchorElement.prototype, 'click');

            const ouvert = ouvrirOuEnregistrer(new Blob(['x'], { type: 'application/msword' }), 'note.doc');

            expect(ouvert).toBeFalse();
            expect(window.open).not.toHaveBeenCalled();
            expect(clic).toHaveBeenCalled();
        });
    });
});
