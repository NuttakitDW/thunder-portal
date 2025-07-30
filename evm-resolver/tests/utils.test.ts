import { uint8ArrayToHex, UINT_40_MAX } from "./utils";

describe("Utils", () => {
  test("uint8ArrayToHex should convert Uint8Array to hex string", () => {
    const bytes = new Uint8Array([0x01, 0x02, 0x03, 0xff]);
    const hex = uint8ArrayToHex(bytes);
    expect(hex).toBe("0x010203ff");
  });

  test("UINT_40_MAX should be the correct value", () => {
    expect(UINT_40_MAX).toBe(BigInt("0xFFFFFFFFFF"));
    expect(UINT_40_MAX).toBe(BigInt(2) ** BigInt(40) - BigInt(1));
  });
});
