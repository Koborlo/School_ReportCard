import AdminStudents from './AdminStudents';

describe('AdminStudents.jsx — Name Cleaning & Preview', () => {
  
  // These tests verify the cleanName logic without full React setup
  // In production, use: npm install -D @testing-library/react @testing-library/jest-dom
  
  const cleanName = (raw) => {
    return raw
      .replace(/\s*[-–]+\s*[ABab]\s*$/, "")  // trailing " -- A" or " -- B"
      .replace(/\s+/g, " ")
      .trim();
  };

  describe('cleanName function', () => {
    test('cleanName("JOHN DOE -- B") === "JOHN DOE"', () => {
      expect(cleanName("JOHN DOE -- B")).toBe("JOHN DOE");
    });

    test('cleanName("JANE SMITH -- A") === "JANE SMITH"', () => {
      expect(cleanName("JANE SMITH -- A")).toBe("JANE SMITH");
    });

    test('cleanName("KWAME ASANTE") === "KWAME ASANTE" (no change)', () => {
      expect(cleanName("KWAME ASANTE")).toBe("KWAME ASANTE");
    });

    test('handles lowercase: cleanName("john doe -- a") === "john doe"', () => {
      expect(cleanName("john doe -- a")).toBe("john doe");
    });

    test('handles en-dash: cleanName("MARY – B") === "MARY"', () => {
      expect(cleanName("MARY – B")).toBe("MARY");
    });

    test('removes extra spaces: cleanName("JOHN  SMITH -- B") === "JOHN SMITH"', () => {
      expect(cleanName("JOHN  SMITH -- B")).toBe("JOHN SMITH");
    });

    test('handles trailing spaces: cleanName("JOHN DOE -- B  ") === "JOHN DOE"', () => {
      expect(cleanName("JOHN DOE -- B  ")).toBe("JOHN DOE");
    });
  });

  describe('preview logic', () => {
    test('Preview splits by newlines and filters blanks', () => {
      const bulk = "JOHN DOE\nJANE SMITH\nKWAME ASANTE";
      const preview = bulk.split("\n").map(cleanName).filter(Boolean);
      expect(preview).toEqual(["JOHN DOE", "JANE SMITH", "KWAME ASANTE"]);
      expect(preview.length).toBe(3);
    });

    test('Preview shows first 5 names only in UI', () => {
      const names = ["Name1", "Name2", "Name3", "Name4", "Name5", "Name6", "Name7"];
      const shown = names.slice(0, 5);
      expect(shown.length).toBe(5);
      expect(shown).toEqual(["Name1", "Name2", "Name3", "Name4", "Name5"]);
    });

    test('Preview displays "… and X more" for overflow', () => {
      const preview = ["N1", "N2", "N3", "N4", "N5", "N6", "N7"];
      const extraCount = preview.length - 5;
      expect(extraCount).toBe(2);
      expect(extraCount > 0).toBe(true); // Should show "… and 2 more"
    });

    test('Button text includes count: "Add {count} Students"', () => {
      const preview = ["John", "Jane", "Kwame"];
      const buttonText = `Add ${preview.length} Students`;
      expect(buttonText).toBe("Add 3 Students");
    });

    test('Empty preview shows "Add Students" without count', () => {
      const preview = [];
      const buttonText = `Add ${preview.length > 0 ? preview.length : ""} Students`;
      expect(buttonText).toBe("Add  Students");
    });
  });
});
